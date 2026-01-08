import streamDeck from "@elgato/streamdeck";

import { DisplayAction } from "./actions/display-action";
import { MarkdownAction } from "./actions/markdown-action";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel("trace");

// Register the display action.
streamDeck.actions.registerAction(new DisplayAction());

// Register the markdown action.
streamDeck.actions.registerAction(new MarkdownAction());

// Finally, connect to the Stream Deck.
streamDeck.connect();
