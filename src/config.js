
const baseUrl = window.location ? window.location.href : "http://myserver.ext"

export const REST_CONFIG = {
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