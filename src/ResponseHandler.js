import _ from 'lodash';
import { LocalDateTime, LocalDate, LocalTime } from 'js-joda';
import { QUERY_AWAIT_SINGLE } from './QueryBuilder';

export default class ResponseHandler {

    constructor(model, json) {
        this.model = model;
        this.json = json;
    }

    static ofJson(model, json) {
        const handler = new ResponseHandler(model, json);
        return handler.handle();
    }

    handle() {
        if (_.isEmpty(this.json)) {
            return this.model.queryBuilder.awaitType == QUERY_AWAIT_SINGLE ? {} : [];
        }

        if (_.isArray(this.json)) {
            return this.deserializeArray(this.json, this.model);
        }

        return this.deserializeOne(this.json, this.model);
    }

    deserializeOne(json, model) {
        // console.log('json', json);
        const instance = this.newInstanceOf(model);
        const dates = instance.getDates();
        const dateNames = Object.keys(dates);
        const fields = instance.getFields();
        const relations = instance.getRelations();
        const relationNames = Object.keys(relations);

        for (const prop in json) {
            if (dateNames.includes(prop)) {
                instance[prop] = this.dateFromString(dates[prop], json[prop]);
            }
            else if (fields.includes(prop)) {
                instance[prop] = json[prop];
            }
            else if (relationNames.includes(prop)) {
                // Allow future lazy loading
                instance.relations[prop].loaded = true;

                if (relations[prop].list) {
                    instance[prop] = this.deserializeArray(json[prop], new relations[prop].class);
                }
                else {
                    instance[prop] = this.deserializeOne(json[prop], new relations[prop].class);
                }
            }
            else if (prop === 'pivot') {
                instance[prop] = json[prop];
            }
        }

        return instance;
    }

    deserializeArray(jsonArray, model) {
        return jsonArray.map((json) => this.deserializeOne(json, model));
    }

    newInstanceOf(obj) {
        return _.clone(obj);
    }

    dateFromString(dateType, dateString) {

        if(dateString === null){
            return null;
        }
        else if (dateType === 'datetime') {
            dateString = dateString.replace('T', ' ');
            dateString = dateString.replace('Z', '');

            const [dateStr, timeStr] = dateString.split(' ');

            const [y, m, d] = dateStr.split('-').map(Number);
            const [h, i, s] = timeStr.split(':').map(Number);

            return LocalDateTime.of(y, m, d, h, i, s);
        }
        else if (dateType === 'time') {
            const [h, i, s] = dateString.split(':').map(Number);

            return LocalTime.of(h, i, s);
        }
        else if (dateType === 'date') {
            const [y, m, d] = dateString.split('-').map(Number);

            return LocalDate.of(y, m, d);
        }

        return null;
    }
}