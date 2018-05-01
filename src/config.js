export const REST_CONFIG = {
    base_url: window.location.href + '/api',

    default_temporal_field: 'created_at',

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
    },
};