import Model from './../../../src/Model';

export default class BaseModel extends Model
{
    async request (queryConfig) {
        this.testApiRequest = queryConfig;

        return {
            data: this.testApiResponse
        };
    }
}