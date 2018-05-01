import _ from 'lodash';
import moment from 'moment';
import {Formatter} from 'sarala-json-api-data-formatter';
import QueryBuilder from './QueryBuilder';
import {config} from './config';

const formatter = new Formatter();

export default class Model {
    constructor() {
        this.queryBuilder = new QueryBuilder();
        this.selfValidate();
        this.type = this.resourceName();
    }

    // override

    getFields() {
        return [];
    }

    getDates() {
        return [];
    }

    getRelations() {
        return {};
    }

    computed() {
        return {};
    }

    resourceName() {
        return null;
    }

    dateFormat() {
        return 'YYYY-MM-DD HH:mm';
    }

    baseUrl() {
        return config.base_url;
    }

    async request(config) {
        // to be implemented in base model
    }

    // requests

    async find(id) {
        let response = await this.request({
            url: `${this.resourceUrl()}${id}${this.queryBuilder.getQuery()}`,
            method: config.http_methods.get,
        });

        return this.respond(response.data);
    }

    async all() {
        let response = await this.request({
            url: `${this.resourceUrl()}${this.queryBuilder.getQuery()}`,
            method: config.http_methods.get,
        });

        return this.respond(response.data);
    }

    async paginate(perPage = 10, page = 1) {
        this.queryBuilder.paginate(perPage, page);

        let response = await this.request({
            url: `${this.resourceUrl()}${this.queryBuilder.getQuery()}`,
            method: config.http_methods.get,
        });

        return this.respond(response.data);
    }

    async save() {
        if (this.hasOwnProperty('id')) {
            return this.update();
        }

        return this.create();
    }

    async create() {
        let response = await this.request({
            url: this.resourceUrl(),
            method: config.http_methods.create,
            data: this.serialize(this.data()),
        });

        return this.respond(response.data);
    }

    async update() {
        let response = await this.request({
            url: this.links.self,
            method: config.http_methods.update,
            data: this.serialize(this.data()),
        });

        return this.respond(response.data);
    }

    async delete() {
        let response = this.request({
            url: this.links.self,
            method: config.http_methods.delete,
        });

        return this.respond(response.data);
    }

    async attach(model, data = null) {
        let queryConfig = {
            url: `${this.links.self}/${model.type}/${model.id}`,
            method: config.http_methods.create,
        };

        if (data) {
            queryConfig.data = data;
        }

        let response = await this.request(queryConfig);

        return this.respond(response.data);
    }

    async detach(model) {
        let response = await this.request({
            url: `${this.links.self}/${model.type}/${model.id}`,
            method: config.http_methods.delete,
        });

        return this.respond(response.data);
    }

    async sync(relationship) {
        const data = this.serialize(this.data());

        let respond = await this.request({
            url: `${this.links.self}/${relationship}`,
            method: config.http_methods.update,
            data: data.data.relationships[relationship],
        });

        return this.respond(respond.data);
    }

    // modify query string

    with(...resourceName) {
        this.queryBuilder.with(...resourceName);

        return this;
    }

    orderBy(column, direction = 'asc') {
        this.queryBuilder.orderBy(column, direction);

        return this;
    }

    limit(limit, offset) {
        this.queryBuilder.limit(limit, offset);

        return this;
    }

    // paginate(pageNumber, perPage = 10) {
    //     this.queryBuilder.paginate(pageNumber, perPage);
    //
    //     return this;
    // }

    orderByDesc(column) {
        return this.orderBy(column, 'desc');
    }

    where(key, operator, value = null) {
        this.queryBuilder.where(key, operator, value);

        return this;
    }

    from(date) {
        this.queryBuilder(date);

        return this;
    }

    to(date) {
        this.queryBuilder.to(date);

        return this;
    }

    select(...fields) {
        this.queryBuilder.select(...fields);

        return this;
    }

    distinct(bool = true){
        this.queryBuilder.distinct(bool);

        return this;
    }

    // build model

    respond(response) {
        if (!_.isEmpty(response)) {
            let data = this.deserialize(response);

            if (this.isCollection(data)) {
                return this.resolveCollection(data);
            }

            return this.resolveItem(data);
        }

        return null;
    }

    resolveCollection(data) {
        let thiss = this;
        let resolved = {};

        if (data.hasOwnProperty('links')) {
            resolved.links = data.links;
        }

        if (data.hasOwnProperty('meta')) {
            resolved.meta = data.meta;
        }

        resolved.data = _.map(data.data, item => {
            return thiss.resolveItem(item);
        });

        return resolved;
    }

    resolveItem(data) {
        return this.hydrate(data);
    }

    hydrate(data) {
        let model = _.clone(this);

        model.id = data.id;
        model.type = data.type;

        if (data.hasOwnProperty('getRelations')) {
            model.relationshipNames = data.relationships;
        }

        if (data.hasOwnProperty('links')) {
            model.links = data.links;
        }

        _.forEach(this.getFields(), field => {
            model[field] = data[field];
        });

        _.forEach(this.getDates(), field => {
            model[field] = moment(data[field]);
        });

        const thiss = this;

        _.forEach(data.relationships, relationship => {
            let relation = model.relationships()[relationship];

            if (_.isUndefined(relation)) {
                throw new Error(`Sarale: Relationship ${relationship} has not been defined in ${model.constructor.name} model.`);
            }

            if (thiss.isCollection(data[relationship])) {
                model[relationship] = relation.resolveCollection(data[relationship]);
            } else {
                model[relationship] = relation.resolveItem(data[relationship].data);
            }
        });

        _.forOwn(model.computed(), (computation, key) => {
            model[key] = computation(model);
        });

        return model;
    }

    // extract data from model


    data() {
        let data = {};

        data.type = this.type;

        if (this.hasOwnProperty('id')) {
            data.id = this.id;
        }

        if (this.hasOwnProperty('relationshipNames')) {
            data.relationships = this.relationshipNames;
        }

        _.forEach(this.getFields(), field => {
            if (!_.isUndefined(this[field])) {
                data[field] = this[field];
            }
        });

        _.forEach(this.getDates(), field => {
            if (!_.isUndefined(this[field])) {
                data[field] = this[field].format(this.dateFormat());
            }
        });

        let thiss = this;

        _.forEach(thiss.getRelations(), (model, relationship) => {
            if (!_.isUndefined(thiss[relationship])) {
                if (_.isArray(thiss[relationship].data)) {
                    data[relationship] = {
                        data_collection: true,
                        data: _.map(thiss[relationship].data, relation => {
                            return relation.data();
                        }),
                    };
                } else {
                    data[relationship] = {
                        data: thiss[relationship].data(),
                    };
                }
            }
        });

        return data;
    }

    // helpers

    resourceUrl() {
        return `${this.baseUrl()}/${this.resourceName()}/`;
    }

    isCollection(data) {
        return data.hasOwnProperty('data_collection') && data.data_collection === true && _.isArray(data.data);
    }

    deserialize(data) {
        return formatter.deserialize(data);
    }

    serialize(data) {
        return formatter.serialize(data);
    }

    selfValidate() {
        const name = this.resourceName();

        if (name === null || !_.isString(name) || name.length === 0) {
            throw new Error(`Sarale: Resource name not defined in ${this.constructor.name} model. Implement resourceName method in the ${this.constructor.name} model to resolve this error.`);
        }
    }
}
