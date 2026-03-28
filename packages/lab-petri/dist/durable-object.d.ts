/**
 * PetriDish Durable Object
 *
 * Simple mutation storage and broadcast system.
 * Stores mutations and current state, broadcasts to WebSocket clients.
 */
export declare class PetriDish implements DurableObject {
    private ctx;
    private env;
    private sessions;
    constructor(ctx: DurableObjectState, env: Env);
    fetch(request: Request): Promise<Response>;
    private handleWebSocket;
    private handleInit;
    private handleMutate;
    private handleSnapshot;
    private getSnapshot;
    private static VALID_TYPES;
    private static LIFECYCLE;
    private sanitizeNodeUpdates;
    private applyMutations;
    private toSnapshot;
    private broadcast;
    webSocketMessage(_ws: WebSocket, _message: string | ArrayBuffer): Promise<void>;
    webSocketClose(ws: WebSocket): Promise<void>;
}
interface Env {
}
export {};
//# sourceMappingURL=durable-object.d.ts.map