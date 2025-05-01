import 'dotenv/config';
import {google} from 'googleapis'
import { capitalize, InstallGlobalCommands } from './utils.js';

// Simple test command
const TEST_COMMAND = {
  name: 'test',
  description: 'Basic command',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const LOGIN = 
{
    name: 'login',
    description: 'generate a login page for google',
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 1, 2],
}

const ALL_COMMANDS = [TEST_COMMAND, LOGIN];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);