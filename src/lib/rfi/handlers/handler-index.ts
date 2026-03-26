import { registerRfiChannelHandler } from "../channel-handler-registry";
import { EmailChannelHandler } from "./email-handler";

// Register all channel handlers here.
// This file is imported once as a side-effect from rfi-service.ts to ensure
// the registry is populated before any handler lookup occurs.
registerRfiChannelHandler(new EmailChannelHandler());
