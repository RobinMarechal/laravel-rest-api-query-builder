import QueryBuilder from './QueryBuilder';

export default class Query {
    static model (model) {
        return new QueryBuilder(typeof model === 'object' ? model.constructor : model);
    }
}
