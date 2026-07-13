import { sanitizeErrorMessage } from "@in.pulse-crm/utils";

function safeStringify(value: unknown) {
	try {
		return JSON.stringify(value);
	} catch {
		return JSON.stringify({ serializationError: true, value: String(value) });
	}
}

export function createFileUploadTraceId(scope: string) {
	const cryptoApi = globalThis.crypto;
	const randomId = typeof cryptoApi?.randomUUID === "function"
		? cryptoApi.randomUUID()
		: `${Date.now()}-${Math.random().toString(16).slice(2)}`;

	return `${scope}-${randomId}`;
}

export function logFileUploadTrace(traceId: string, stage: string, details?: unknown) {
	const prefix = `[file-trace][frontend][${traceId}] ${stage}`;
	if (details === undefined) {
		console.info(prefix);
		return;
	}

	console.info(prefix, details);
	console.debug(`${prefix} details=${safeStringify(details)}`);
}

export function logFileUploadTraceError(traceId: string, stage: string, error: unknown, details?: unknown) {
	const prefix = `[file-trace][frontend][${traceId}] ${stage}`;
	console.error(prefix, {
		error: sanitizeErrorMessage(error),
		details,
		raw: error,
	});
}