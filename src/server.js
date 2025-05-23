/**
 * The core server that runs on a Cloudflare worker.
 */

import { AutoRouter, withParams } from 'itty-router';
import {
  InteractionResponseType,
  InteractionType,
  verifyKey,
} from 'discord-interactions';
import { TEST, LOGIN_TO_GOOGLE} from './commands.js';
import { google, Auth }from 'googleapis'
import { InteractionResponseFlags } from 'discord-interactions';

class JsonResponse extends Response {
  constructor(body, init) {
    const jsonBody = JSON.stringify(body);
    init = init || {
      headers: {
        'content-type': 'application/json;charset=UTF-8',
      },
    };
    super(jsonBody, init);
  }
}

const router = AutoRouter();

     let scopes =[
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.readonly"
    ];

const authClient = new Auth.OAuth2Client(
  process.env.GOOGLE_CLIENT_ID, 
  process.env.GOOGLE_CLIENT_SECRET,
  "https://augustsabode.uk/oauth2flow"
)

const calendar = google.calendar('v3');

/**
 * A simple :wave: hello page to verify the worker is working.
 */
router.get('/', (request, env) => {
  return new Response(`👋 ${env.DISCORD_APPLICATION_ID}`);
});

router.get('/oauth2flow', async ({ query }) => {
  const {tokens} = await authClient.getToken(query.code)
  google.options({auth: authClient})
  if (tokens)
  {
    authClient.setCredentials(tokens);
    return new Response("Login Success")
  }
  else
  {
    return new Response("Login Failure")
  }
  
})

/**
 * Main route for all requests sent from Discord.  All incoming messages will
 * include a JSON payload described here:
 * https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-object
 */
router.post('/', async (request, env) => {
  console.log("interaction logged")
  const { isValid, interaction } = await server.verifyDiscordRequest(
    request,
    env,
  );

  console.log(interaction.data.name)
  if (!isValid || !interaction) {
    return new Response('Bad request signature.', { status: 401 });
  }

  if (interaction.type === InteractionType.PING) {
    // The `PING` message is used during the initial webhook handshake, and is
    // required to configure the webhook in the developer portal.
    return new JsonResponse({
      type: InteractionResponseType.PONG,
    });
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    // Most user commands will come as `APPLICATION_COMMAND`.
    switch (interaction.data.name.toLowerCase()) {
      case TEST.name.toLowerCase(): {
        return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "I am so fucking cool",
          },
        });
      }
      case LOGIN_TO_GOOGLE.name.toLowerCase():{
          return new JsonResponse(
            {
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: `follow this link to login with google ${
                        authClient.generateAuthUrl({
                            access_type: 'online',
                            scope: scopes,
                            client_id: env.GOOGLE_CLIENT_ID,
                            redirect_uri: "https://augustsabode.uk/oauth2flow"
                        }
                    )}`
                }
            });
      }
      case SYNC.name.toLowerCase():
        {
          try{
            console.log(await (calendar.calendarList.list()).data)
            let response =""
            console.log("attempting Request")
            response = await (calendar.calendarList.list()).data
            console.log("cant return response")
            return new JsonResponse({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: response
              },
            });
          }
        catch(error)
        {
          console.log(error)
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: error
            },
          });
        }
      }
      default:
        return new JsonResponse({ error: 'Unknown Type' }, { status: 400 });
    }
  }

  console.error('Unknown Type');
  return new JsonResponse({ error: 'Unknown Type' }, { status: 400 });
});
router.all('*', () => new Response('Not Found.', { status: 404 }));

async function verifyDiscordRequest(request, env) {
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  const body = await request.text();
  const isValidRequest =
    signature &&
    timestamp &&
    (await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY));
  if (!isValidRequest) {
    return { isValid: false };
  }

  return { interaction: JSON.parse(body), isValid: true };
}

const server = {
  verifyDiscordRequest,
  fetch: router.fetch,
};

export default server;
