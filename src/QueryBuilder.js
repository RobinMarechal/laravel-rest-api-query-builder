import _ from 'lodash';
import {config} from './config';

export default class QueryBuilder {
    constructor() {
        this.query = '';
        this.with = [];
        this.sorts = [];
        this.fields = [];
        this.limitRows = null;
        this.fromDate = null;
        this.toDate = null;
        this.selectDistinct = false;
        this.wheres = [];
    }

    with(...resourceName) {
        if (!this.with[resourceName]) {
            this.with.push(...resourceName);
        }
    }

    limit(limit, offset) {
        this.limitRows = {limit, offset};
    }

    paginate(perPage = 10, pageNumber = 1) {
        this.limit(perPage, pageNumber * perPage - perPage);
    }

    orderBy(column, direction = 'asc') {
        direction = direction.toLowerCase();
        if (!['asc', 'desc'].includes(direction)) {
            throw new Error(`Sarale: Invalid sort direction: "${direction}". Allowed only "asc" or "desc" (case insensitive).`);
        }

        this.sorts.push({column, direction});
    }

    where(key, operator, value) {
        if (_.isNull(value)) {
            value = operator;
            operator = '=';
        }

        this.wheres.push({key, operator, value});
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

    getQuery() {
        this.appendIncludes();
        this.appendLimit();
        this.appendSort();
        this.appendFromTo();
        this.appendFields();
        this.appendWheres();
        this.appendDistinct();

        if (this.query.length) {
            this.query = `?${this.query}`;
        }

        return this.query;
    }

    appendDistinct() {
        if (this.selectDistinct) {
            this.appendQuery(`${config.request_keywords.selectDistinct}=${this.selectDistinct}`);
        }
    }

    appendFromTo() {
        if (this.fromDate) {
            this.appendQuery(`${config.request_keywords.from}=${this.fromDate}`);
        }

        if (this.toDate) {
            this.appendQuery(`${config.request_keywords.to}=${this.toDate}`);
        }
    }

    appendWheres() {
        for (const where of this.wheres) {
            this.appendQuery(`${config.request_keywords.where}[]=${where.key},${where.operator},${where.value}`);
        }
    }

    appendIncludes() {
        if (this.with.length) {
            this.appendQuery(`${config.request_keywords.load_relations}=${this.with.toString()}`);
        }
    }

    appendFields() {
        if (this.fields.length) {
            this.appendQuery(`${config.request_keywords.select_fields}=${this.fields.join(',')}`);
        }
    }

    appendSort() {
        if(this.sorts.length){
            const fieldsArray = this.sorts.map(({column, direction}) => (direction === 'desc' ? '-' : '') + column);
            this.appendQuery(`${config.request_keywords.order_by}=${fieldsArray.join(',')}`);
        }
    }

    appendLimit() {
        if (this.limitRows) {
            this.appendQuery(`limit=${this.limitRows.limit}&offset=${this.limitRows.offset}`);
        }
    }

    appendQuery(append) {
        if (this.query.length) {
            append = `&${append}`;
        }

        this.query += append;
    }
}
