import { FileSDK } from '@in.pulse-crm/sdk'
import axios from 'axios'

const axiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_FILES_URL,
    timeout: 60000,
});

export default new FileSDK(axiosInstance);