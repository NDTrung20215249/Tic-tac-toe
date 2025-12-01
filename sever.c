#include <stdio.h>
#include <stdlib.h>
#include <libwebsockets.h>

// --- 1. Protocol Structure ---
// Defines how the server handles different client connections (protocols).
static int callback_tic_tac_toe(
    struct lws *wsi, 
    enum lws_callback_reasons reason, 
    void *user, 
    void *in, 
    size_t len)
{
    switch (reason) {
        case LWS_CALLBACK_ESTABLISHED:
            // This is triggered when a WebSocket connection is successfully opened.
            lwsl_user("Client connected successfully.\n");
            break;
            
        case LWS_CALLBACK_CLOSED:
            // This is triggered when the client disconnects.
            lwsl_user("Client disconnected.\n");
            break;
            
        case LWS_CALLBACK_RECEIVE:
            // This is triggered when the client sends a message. (Stream Handling)
            lwsl_user("Received message: %s (length: %zu)\n", (const char *)in, len);
            
            // To be expanded later: process JSON, validate move, send response.
            break;

        default:
            break;
    }
    return 0;
}

// Defines our single protocol for the game.
static struct lws_protocols protocols[] = {
    {
        "tic-tac-toe-protocol",     // Name of the protocol (used by the client)
        callback_tic_tac_toe,       // The function that handles events
        0,                          // Per-session user data size (not used yet)
        0,                          // RX buffer size (not used yet)
    },
    { NULL, NULL, 0, 0 } /* terminator */
};

// --- 2. Main Server Setup ---
int main(void)
{
    struct lws_context_creation_info info;
    struct lws_context *context;
    int n = 0;

    // Set up basic logging
    lws_set_log_level(LLL_USER | LLL_ERR | LLL_WARN | LLL_NOTICE, NULL);

    // Zero out the info struct to avoid reading garbage from the stack
    memset(&info, 0, sizeof(info));
    
    // Configure server settings
    info.port = 7681; // Our server port
    info.protocols = protocols;
    info.gid = -1;
    info.uid = -1;
    
    // Create the context, which manages all connections (Socket I/O mechanism)
    context = lws_create_context(&info);

    if (!context) {
        lwsl_err("lws_create_context failed. Is port %d already in use?\n", info.port);
        return 1;
    }
    
    lwsl_user("LWS server started on port %d...\n", info.port);

    // Main event loop (Stream Handling/Socket Polling)
    // The server constantly polls its sockets for activity.
    while (n >= 0) {
        n = lws_service(context, 50); // Checks for events every 50ms
    }

    // Cleanup
    lws_context_destroy(context);

    return 0;
}