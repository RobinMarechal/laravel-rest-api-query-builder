import Fool from './dummy/models/Fool';
import Unicorn from './dummy/models/Unicorn';
import {config} from '../src/config';

const initModelLikeAFool = () => {
    new Fool();
};

config.base_url = 'test://un.it/api';

test('it throws error when try to initialize model without resource name', () => {
    expect(initModelLikeAFool).toThrow('Sarale: Resource name not defined in Fool model. Implement getNamespace method in the Fool model to resolve this error.');
});

test('can call overridable methods of initialize model', () => {
    const unicorn = new Unicorn();

    expect(unicorn.getFields()).toEqual([]);
    expect(unicorn.getDates()).toEqual([]);
    expect(unicorn.getRelations()).toEqual({});
    expect(unicorn.computed()).toEqual({});
    expect(unicorn.getNamespace()).toEqual('unicorns');
    expect(unicorn.getBaseUrl()).toEqual('test://un.it/api');
    expect(unicorn.dateFormat()).toEqual('YYYY-MM-DD HH:mm');
});