export interface CallPreparation { callId:string;direction:"outgoing"|"incoming";number:string;scheduleId?:number }
export interface CallReport { callId:string;eventId:string;type:"sent"|"ringing"|"answered"|"ended"|"failed"|"rejected"|"transferred";occurredAt:string;detail?:string;sipCallId?:string }
