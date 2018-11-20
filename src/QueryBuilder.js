import _ from 'lodash';
import Model from "./Model";
import UnreachableServerException from "bunch-of-exceptions/build/exceptions/UnreachableServerException";
import InvalidUrlException from "bunch-of-exceptions/build/exceptions/InvalidUrlException";
import Exception from "bunch-of-exceptions/build/libs/Exception";
import ResponseHandler from "./ResponseHandler";

export const QUERY_AWAIT_SINGLE = 'QUERY_AWAIT_SINGLE';
export const QUERY_AWAIT_COLLECTION = 'QUERY_AWAIT_COLLECTION';

export default class QueryBuilder {
    constructor(modelClass) {
        this.reset();
        this.modelClass = modelClass;
        this.emptyModel = new modelClass();
        this.REST_CONFIG = modelClass.REST_CONFIG;
    }

    reset() {
        this.url = '';
        this.path = '';
        this.query = '';
        this.relations = [];
        this.sorts = [];
        this.fields = [];
        this.limitRows = null;
        this.fromDate = null;
        this.toDate = null;
        this.selectDistinct = false;
        this.wheres = [];
        this.owner = null;
        this.customs = [];
        this.awaitType = QUERY_AWAIT_COLLECTION;
    }

    /**
     * Load a relation of a resource.
     * @param modelInstance Either a model instance, of the model class itself (in this case, the id must be provided)
     * @param id the if of the base resource (optional if a model instance is provided, mandatory in the other case)
     * @returns {QueryBuilder} this
     */
    relationOf(modelInstance, id = null) {
        if (modelInstance instanceof Model && !id) {
            id = modelInstance;
        }
        else if (typeof modelInstance === 'function') {
            modelInstance = new modelInstance();
        }
        else {
            throw new TypeError("model parameter should be a Model instance");
        }

        const namespace = modelInstance.namespace;

        this.owner = {
            namespace,
            id,
        };

        return this;
    }

    ofModel(model) {
        return this.relationOf(model)
    }

    of(modelInstance, id = null) {
        return this.relationOf(modelInstance, id);
    }

    with(...resourceName) {
        if (!this.relations[resourceName]) {
            this.relations.push(...resourceName);
        }

        return this;
    }

    limit(limit, offset) {
        this.limitRows = {limit, offset};
        return this;
    }

    orderBy(...fields) {
        for (const field of fields) {
            let direction = 'ASC';
            let column = field;
            if (column[0] === '-') {
                direction = 'DESC';
                column = field.substr(1);
            }

            this.sorts.push({column, direction});
        }

        return this;
    }

    where(key, operator, value = null) {
        if (_.isNull(value)) {
            value = operator;
            operator = '=';
        }

        this.wheres.push({key, operator, value});

        return this;
    }

    select(...fields) {
        this.fields = fields;
        return this;
    }

    distinct(bool = true) {
        this.selectDistinct = bool;
        return this;
    }

    from(date) {
        this.fromDate = date;
        return this;
    }

    to(date) {
        this.toDate = date;
        return this;
    }

    addCustomParameter(key, value) {
        this.customs.push({key, value});
        return this;
    }

    buildUrl(namespace, id) {
        this._setPath(namespace, id);

        this._appendQuery();

        return this.path + this.query;
    }

    _setPath(namespace, id) {
        this.path = this.REST_CONFIG.base_url;
        this._appendOwner();
        this._appendNamespace(namespace, id);
    }

    _appendOwner() {
        if (this.owner && this.owner.model && this.owner.id) {
            this.path += `/${this.owner.model.namespace}/${this.owner.id}`;
        }
    }

    _appendNamespace(namespace, id) {
        this.path += `/${namespace}`;
        if (id) {
            this.path += `/${id}`;
        }
    }

    _appendDistinct() {
        if (this.selectDistinct) {
            this._append(`${this.REST_CONFIG.request_keywords.selectDistinct}=${this.selectDistinct}`);
        }
    }

    _appendFromTo() {
        if (this.fromDate) {
            this._append(`${this.REST_CONFIG.request_keywords.from}=${this.fromDate}`);
        }

        if (this.toDate) {
            this._append(`${this.REST_CONFIG.request_keywords.to}=${this.toDate}`);
        }
    }

    _appendWheres() {
        for (const where of this.wheres) {
            this._append(`${this.REST_CONFIG.request_keywords.where}[]=${where.key},${where.operator},${where.value}`);
        }
    }

    _appendIncludes() {
        if (this.relations.length) {
            this._append(`${this.REST_CONFIG.request_keywords.load_relations}=${this.relations.join(';')}`);
        }
    }

    _appendFields() {
        if (this.fields.length) {
            this._append(`${this.REST_CONFIG.request_keywords.select_fields}=${this.fields.join(',')}`);
        }
    }

    _appendSort() {
        if (this.sorts.length) {
            const fieldsArray = this.sorts.map(({column, direction}) => (direction === 'desc' ? '-' : '') + column);
            this._append(`${this.REST_CONFIG.request_keywords.order_by}=${fieldsArray.join(',')}`);
        }
    }

    _appendLimit() {
        if (this.limitRows) {
            const {limit, offset} = this.limitRows;

            this._append(`${this.REST_CONFIG.request_keywords.limit}=${limit}`);
            if (offset) {
                this._append(`${this.REST_CONFIG.request_keywords.offset}=${offset}`);
            }
        }
    }

    _appendCustoms() {
        for (const {key, value} of this.customs) {
            this._append(`${key}=${value}`);
        }
    }

    _appendQuery() {
        this._appendIncludes();
        this._appendLimit();
        this._appendSort();
        this._appendFromTo();
        this._appendFields();
        this._appendWheres();
        this._appendDistinct();
        this._appendCustoms();

        if (this.query.length) {
            this.query = `?${this.query}`;
        }
    }

    _append(append) {
        if (this.query.length) {
            append = `&${append}`;
        }

        this.query += append;
    }

    // run query

    _getUrlFunctionOfId(id) {
        if (id) {
            return this.buildUrl(this.emptyModel.namespace, id);
        } else {
            const snakeCase = this.constructor.name
                .replace(/([A-Z]+)/g, (x, y) => "_" + y.toLowerCase())
                .replace(/^_/, "");

            return this.buildUrl(snakeCase);
        }
    }


    async request(url, config) {
        config.headers = {
            "Content-Type": 'application/json',
        };

        if (this.REST_CONFIG.cross_origin) {
            config.mode = 'cors';
        }

        config = this.emptyModel.beforeFetch(config);

        let response = await fetch(url, config);

        if (!response.ok) {
            if (response.status >= 500) {
                throw new UnreachableServerException(`The server returned HTTP code ${response.status} (${response.statusText})`);
            }

            if (response.status >= 400) {
                throw new InvalidUrlException(`The server returned HTTP code ${response.status} (${response.statusText})`);
            }

            throw new Exception(`Fetch failed with response: ${response.statusText}`);
        }

        response = this.emptyModel.afterFetch(response);

        return (await response.json());
    }


    respond(json) {
        json = this.emptyModel.computeJsonBeforeParsing(json);
        return ResponseHandler.ofJson(this.emptyModel, json);
    }

    async find(id){
        this.awaitType = QUERY_AWAIT_SINGLE;

        let url = this._getUrlFunctionOfId(id);

        let response = await this.request(url, {
            method: this.REST_CONFIG.http_methods.get,
        });

        return this.respond(response.data);
    }


    async all() {
        const url = this.buildUrl(this.emptyModel.namespace);
        let response = await this.request(url, {
            method: this.REST_CONFIG.http_methods.get,
        });

        return this.respond(response.data);
    }

    async paginate(perPage = 10, page = 1) {
        this.limit(perPage, page * perPage - perPage);

        const url = this.buildUrl(this.emptyModel.namespace);
        let response = await this.request(url, {
            method: this.REST_CONFIG.http_methods.get,
        });

        return this.respond(response.data);
    }
}

