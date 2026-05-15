// Import every handler file here to register it with JobRegistry.
// The side-effect of each import calls JobRegistry.register().
import './handlers/hello-world';
import './handlers/rfi-inbound-mail';