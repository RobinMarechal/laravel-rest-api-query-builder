import _ from 'lodash';
import { REST_CONFIG } from './config';

export const QUERY_AWAIT_SINGLE = 'QUERY_AWAIT_SINGLE';
export const QUERY_AWAIT_COLLECTION = 'QUERY_AWAIT_COLLECTION';

export default class QueryBuilder {
    constructor() {
        this.reset();
    }

    reset(){
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

    relationOf(namespace, id) {
        this.owner = {
            namespace,
            id,
        };
    }

    with(...resourceName) {
        if (!this.relations[resourceName]) {
            this.relations.push(...resourceName);
        }
    }

    limit(limit, offset) {
        this.limitRows = { limit, offset };
    }

    paginate(perPage = 10, pageNumber = 1) {
        this.limit(perPage, pageNumber * perPage - perPage);
    }

    orderBy(column, direction = 'asc') {
        direction = direction.toLowerCase();
        if (!['asc', 'desc'].includes(direction)) {
            throw new Error(`LRA Query Builder: Invalid sort direction: "${direction}". Allowed only "asc" or "desc" (case insensitive).`);
        }

        this.sorts.push({ column, direction });
    }

    where(key, operator, value) {
        if (_.isNull(value)) {
            value = operator;
            operator = '=';
        }

        this.wheres.push({ key, operator, value });
    }

    select(...fields) {
        this.fields = fields;
    }

    distinct(bool = true) {
        this.selectDistinct = bool;
    }

    from(date) {
        this.from = date;
    }

    to(date) {
        this.to = date;
    }

    addCustomParameter(key, value) {
        this.customs.push({ key, value });
    }

    buildUrl(namespace, id) {
        this._setPath(namespace, id);

        this._appendQuery();

        return this.path + this.query;
    }

    _setPath(namespace, id) {
        this.path = REST_CONFIG.base_url;
        this._appendOwner();
        this._appendNamespace(namespace, id);
    }

    _appendOwner() {
        if (this.owner && this.owner.namespace && this.owner.id) {
            this.path += `/${this.owner.namespace}/${this.owner.id}`;
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
            this._append(`${REST_CONFIG.request_keywords.selectDistinct}=${this.selectDistinct}`);
        }
    }

    _appendFromTo() {
        if (this.fromDate) {
            this._append(`${REST_CONFIG.request_keywords.from}=${this.fromDate}`);
        }

        if (this.toDate) {
            this._append(`${REST_CONFIG.request_keywords.to}=${this.toDate}`);
        }
    }

    _appendWheres() {
        for (const where of this.wheres) {
            this._append(`${REST_CONFIG.request_keywords.where}[]=${where.key},${where.operator},${where.value}`);
        }
    }

    _appendIncludes() {
        if (this.relations.length) {
            this._append(`${REST_CONFIG.request_keywords.load_relations}=${this.relations.join(',')}`);
        }
    }

    _appendFields() {
        if (this.fields.length) {
            this._append(`${REST_CONFIG.request_keywords.select_fields}=${this.fields.join(',')}`);
        }
    }

    _appendSort() {
        if (this.sorts.length) {
            const fieldsArray = this.sorts.map(({ column, direction }) => (direction === 'desc' ? '-' : '') + column);
            this._append(`${REST_CONFIG.request_keywords.order_by}=${fieldsArray.join(',')}`);
        }
    }

    _appendLimit() {
        if (this.limitRows) {
            const { limit, offset } = this.limitRows;

            this._append(`${REST_CONFIG.request_keywords.limit}=${limit}`);
            if (offset) {
                this._append(`${REST_CONFIG.request_keywords.offset}=${offset}`);
            }
        }
    }

    _appendCustoms() {
        for (const { key, value } of this.customs) {
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
}
