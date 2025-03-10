import axios, { AxiosInstance, CreateAxiosDefaults } from "axios";

class Service {
    protected xhr: AxiosInstance;

    constructor(config: CreateAxiosDefaults) {
        this.xhr = axios.create(config);
    }
}

export default Service;