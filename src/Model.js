import _ from 'lodash';
import {QUERY_AWAIT_SINGLE} from './QueryBuilder';
import {UnimplementedException} from 'bunch-of-exceptions';
import Query from "./Query";

export default class Model {
    constructor() {
        this.selfValidate();
        this.type = this.getNamespace();

        this.owner = null;

        this.fields = this.getFields();
        this.relations = this.getRelations();
        this.dates = this.getDates();
        this.namespace = this.getNamespace();
    }

    // override

    getFields() {
        throw UnimplementedException("Method getFields() must be implemented in every child class.");
    }

    getDates() {
        return {};
    }

    getRelations() {
        return {};
    }

    computed() {
        return {};
    }

    getNamespace() {
        throw UnimplementedException("Method getNamespace() must be implemented in every child class.");
    }

    getBaseUrl() {
        return this.REST_CONFIG.base_url;
    }

    /**
     * Make changes or use fetch config before the request
     * @param fetchConfig the config
     * @returns the changed fetch config
     */
    beforeFetch(fetchConfig) {
        return fetchConfig;
    }

    /**
     * Make changes or use fetch response before the jsoning
     * @param fetchResponse the fetch response
     * @returns the changed response
     */
    afterFetch(fetchResponse) {
        return fetchResponse;
    }

    toJson() {
        const json = {};

        const fields = this.getFields();
        const relations = this.getRelations();
        const relationsName = Object.keys(relations);
        const dates = this.getDates();
        const datesName = Object.keys(dates);

        for (const prop in this) {
            if (fields.includes(prop)) {
                json[prop] = this[prop];
            }
            else if (datesName.includes(prop)) {
                json[prop] = this[prop].toString();
                if (json[prop].includes('T')) {
                    json[prop] = json[prop].replace('T', ' ').replace('Z', '');
                }
            }
            else if (relationsName.includes(prop)) {
                if (relations[prop].list) {
                    json[prop] = this[prop].map((one) => one.toJson());
                }
                else {
                    json[prop] = this[prop].toJson();
                }
            }
        }

        return json;
    }


    /**
     * Force Lazy loading of a relation to the model and returns the loaded relation
     * @param {string} relation the relation to load and to retrieve
     * @returns {Promise<*>} the loaded relation
     */
    async forceLazyLoadAndGet(relation) {
        await this.forceLazyLoad(relation);
        return this[relation];
    }

    /**
     * Lazy loads a relation to the model and returns the loaded relation
     * @param {string} relation the relation to load and to retrieve
     * @returns {Promise<*>} the loaded relation
     */
    async lazyLoadAndGet(relation) {
        await this.lazyLoad(relation);
        return this[relation];
    }

    /**
     * Lazy loads relations to the model.
     * Does not load already loaded relations.
     * To force the load, use Model#forceLazyLoad() method
     *
     * @param {...string} relations a list of relations to load. The function doesn't reload an already loaded relation.
     * @returns {Promise<*>} formatted loaded relation if single, otherwise returns this.
     */
    async lazyLoad(...relations) {
        relations = this.filterLoadedRelations(...relations);
        return this.forceLazyLoad(...relations);
    }

    /**
     * Lazy loads relations to the model.
     * This function FORCE all relations to be loaded, even the already loaded ones.
     * To avoid the force reload, use Model#lazyLoad() method
     *
     * @param {...string} relations a list of relations to load.
     * @returns {Promise<*>} this.
     */
    async forceLazyLoad(...relations) {
        if (relations.length > 0) {
            try {
                const newThis = await Query.model(this).with(...relations).find(this.id);
                for (const r of relations) {
                    this[r] = newThis[r];
                    this.relations[r].loaded = true;
                }
            } catch (e) {
                console.error(`Lazy loading error. Relation '${relations.join("', '")}' of '${this.constructor.name}':`);
                console.error(e);
                for (const r of relations) {
                    this.relations[r] = [];
                }
            }
        }

        return this;
    }

    /**
     * Filter the relations that have already been loaded.
     * @param {string} relations the model's relations
     * @returns {array} the filtered relations (that haven't been loaded yet)
     */
    filterLoadedRelations(...relations) {
        const arr = [];
        for (const r of relations) {
            if (!this.relations[r].loaded) {
                arr.push(r);
            }
        }

        return arr;
    }

    // requests


    async save() {
        this.queryBuilder.awaitType = QUERY_AWAIT_SINGLE;
        if (this.hasOwnProperty('id')) {
            return this.update();
        }

        return this.create();
    }

    async create() {
        this.queryBuilder.awaitType = QUERY_AWAIT_SINGLE;

        const url = this.queryBuilder.buildUrl(this.namespace);
        let response = await this.request(url, {
            method: this.REST_CONFIG.http_methods.create,
            body: JSON.stringify(this.toJson()),
        });

        return this.respond(response.data);
    }

    async update() {
        this.queryBuilder.awaitType = QUERY_AWAIT_SINGLE;

        const url = this.queryBuilder.buildUrl(this.namespace, this.id);
        let response = await this.request(url, {
            method: this.REST_CONFIG.http_methods.update,
            body: JSON.stringify(this.toJson()),
        });

        return this.respond(response.data);
    }

    async delete() {
        this.queryBuilder.awaitType = QUERY_AWAIT_SINGLE;

        const url = this.queryBuilder.buildUrl(this.namespace, this.id);
        let response = this.request(url, {
            method: this.REST_CONFIG.http_methods.delete,
        });

        return this.respond(response.data);
    }

    async attach(model, body = null, sync = false) {
        this.queryBuilder.awaitType = QUERY_AWAIT_SINGLE;

        this.relationOfModel(this);
        const url = this.queryBuilder.buildUrl(model.namespace, model.id);
        const queryConfig = {
            method: sync ? this.REST_CONFIG.http_methods.update : this.REST_CONFIG.http_methods.create,
        };

        if (body) {
            queryConfig.body = JSON.stringify(body);
        }

        let response = await this.request(url, queryConfig);

        return this.respond(response.data);
    }

    async sync(model, data, detaching = true) {
        this.queryBuilder.awaitType = QUERY_AWAIT_SINGLE;
        if (!detaching) {
            this.queryBuilder.addCustomParameter(this.REST_CONFIG.request_keywords.sync_detaching, detaching);
        }
        return this.attach(model, data, true);
    }

    async detach(model) {
        this.queryBuilder.awaitType = QUERY_AWAIT_SINGLE;

        this.relationOfModel(this);

        const url = this.queryBuilder.buildUrl(model.namespace, model.id);
        let response = await this.request(url, {
            method: this.REST_CONFIG.http_methods.delete,
        });

        return this.respond(response.data);
    }

    // build model

    /**
     * Make changes to the received json before the parsing
     * @param json the json received
     * @returns the computed json
     */
    computeJsonBeforeParsing(json) {
        return json;
    }

    // lib

    selfValidate() {
        const name = this.getNamespace();

        if (!name || !_.isString(name) || name.length === 0) {
            throw new Error(
                `LRA Query Builder: Resource name not defined in ${this.constructor.name} model. Implement resourceName method in the ${this.constructor.name} model to resolve this error.`);
        }
    }
}


const baseUrl = window.location ? window.location.href : "http://myserver.ext"
Model.prototype.REST_CONFIG = {
    base_url: baseUrl + '/api',

    default_temporal_field: 'created_at',

    cross_origin: false,

    http_methods: {
        get: 'GET',
        create: 'POST',
        update: 'PUT',
        delete: 'DELETE',
    },

    request_keywords: {
        load_relations: 'with',
        limit: 'limit',
        offset: 'offset',
        order_by: 'orderby',
        order: 'order',
        from: 'from',
        to: 'to',
        select_fields: 'select',
        where: 'where',
        distinct: 'selectDistinct',
        get_all: 'all',
        sync_without_detaching: 'sync_without_detaching'
    },
};