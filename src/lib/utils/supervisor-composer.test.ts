import { describe, expect, it } from "vitest";
import { messageLengthHint, SUPERVISOR_MESSAGE_MAX_LENGTH } from "./supervisor-composer";

describe("contador do campo de pergunta", () => {
	it("segue o limite do ai-service", () => {
		expect(SUPERVISOR_MESSAGE_MAX_LENGTH).toBe(4000);
	});

	it("só aparece depois de 80% do limite", () => {
		expect(messageLengthHint(0)).toBeNull();
		expect(messageLengthHint(3200)).toBeNull();
		expect(messageLengthHint(3201)).toEqual({ label: "3.201 / 4.000", atLimit: false });
		expect(messageLengthHint(4000)).toEqual({ label: "4.000 / 4.000", atLimit: true });
		expect(messageLengthHint(4500)).toEqual({ label: "4.000 / 4.000", atLimit: true });
		expect(messageLengthHint(90, 100)).toEqual({ label: "90 / 100", atLimit: false });
		expect(messageLengthHint(Number.NaN)).toBeNull();
	});
});
