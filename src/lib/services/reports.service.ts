import { ReportSDK } from '@in.pulse-crm/sdk'
import axios from 'axios'

const axiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_REPORTS_URL,
    timeout: 120000,
});

export default new ReportSDK(axiosInstance);