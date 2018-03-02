import Post from './dummy/models/Post';
import {config} from '../src/config';

config.base_url = 'test://un.it/api';

describe('query builder', () => {
    test('all', async () => {
        const post = new Post();
        post.testApiResponse = {};
        await post.all();

        expect(post.testApiRequest).toEqual({
            method: 'GET',
            url: config.base_url + '/posts/',
        });
    });

    test('find', async () => {
        const post = new Post();
        post.testApiResponse = {};
        await post.find(1);

        expect(post.testApiRequest).toEqual({
            method: 'GET',
            url: config.base_url + '/posts/1',
        });
    });

    test('with', async () => {
        const post = new Post();
        post.testApiResponse = {};
        await post.with('tags', 'author', 'comments.author').find(1);

        expect(post.testApiRequest).toEqual({
            method: 'GET',
            url: config.base_url + '/posts/1?with=tags,author,comments.author',
        });
    });

    test('paginate', async () => {
        const post = new Post();
        post.testApiResponse = {};
        await post.paginate(10, 4);

        expect(post.testApiRequest).toEqual({
            method: 'GET',
            url: config.base_url + '/posts/?limit=10&offset=30',
        });
    });

    describe('sorting', () => {
        test('orderBy', async () => {
            const post = new Post();
            post.testApiResponse = {};
            await post.orderBy('published_at').all();

            expect(post.testApiRequest).toEqual({
                method: 'GET',
                url: config.base_url + '/posts/?orderby=published_at',
            });
        });

        test('orderByDesc', async () => {
            const post = new Post();
            post.testApiResponse = {};
            await post.orderByDesc('published_at').all();

            expect(post.testApiRequest).toEqual({
                method: 'GET',
                url: config.base_url + '/posts/?orderby=-published_at',
            });
        });

        test('chain sorts methods', async () => {
            const post = new Post();
            post.testApiResponse = {};
            await post.orderBy('author.name').orderByDesc('published_at').all();

            expect(post.testApiRequest).toEqual({
                method: 'GET',
                url: config.base_url + '/posts/?orderby=author.name,-published_at',
            });
        });

        test('it throws error for invalid sorts directions', () => {
            const doDumb = () => {
                const post = new Post();
                post.orderBy('author.name', 'crap');
            };

            expect(doDumb).toThrow(`Sarale: Invalid sort direction: "crap". Allowed only "asc" or "desc" (case insensitive).`);
        });
    });

    describe('sparse fields', () => {
        test('model fields as an array', async () => {
            const post = new Post();
            post.testApiResponse = {};
            await post.select('title', 'subtitle').all();

            expect(post.testApiRequest).toEqual({
                method: 'GET',
                url: config.base_url + '/posts/?select=title,subtitle',
            });
        });

        test('relationships fields as an object', async () => {
            const post = new Post();
            post.testApiResponse = {};
            await post.select('title', 'subtitle', 'tags.name').all();

            expect(post.testApiRequest).toEqual({
                method: 'GET',
                url: config.base_url + '/posts/?select=title,subtitle,tags.name',
            });
        });
    });

    describe('filtering', () => {
        test('where no operator', async () => {
            const post = new Post();
            post.testApiResponse = {};
            await post.where('published-before', '2018-01-01').all();

            expect(post.testApiRequest).toEqual({
                method: 'GET',
                url: config.base_url + '/posts/?where[]=published-before,=,2018-01-01',
            });
        });

        test('where operator', async () => {
            const post = new Post();
            post.testApiResponse = {};
            await post.where('published-before', 'LIKE', '2018-01-%')
                .where('likes-above', '>', 100)
                .all();

            expect(post.testApiRequest).toEqual({
                method: 'GET',
                url: config.base_url + '/posts/?where[]=published-before,LIKE,2018-01-%&where[]=likes-above,>,100',
            });
        });
    });

    test('chain filters with paginate', async () => {
        const post = new Post();
        post.testApiResponse = {};
        await post.with('tags', 'author', 'comments.author').paginate(10, 4);

        expect(post.testApiRequest).toEqual({
            method: 'GET',
            url: config.base_url + '/posts/?with=tags,author,comments.author&limit=10&offset=30',
        });
    });
});