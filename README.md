# toggl-report-bot

Worker that automates sending timesheets from Toggl

This project integrates with the Toggl API to email invoices to you to send to your clients. It supports standard hourly billing and higher advanced rates based on a toggl tag. Right now you should put this behind CF Zero Trust for access control.

Future plans include:
- Support for retainers
- Generating invoices in a PDF format and attaching them to the email
- Shareable links to invoices
- Clean up code (very hacky atm and not well structured)

## Deployment

Rename and customize the wrangler.toml.example file to wrangler.toml and run `wrangler deploy` to deploy the worker. You'll need all of the
necessary environment variables set in your wrangler.toml file.

Does this save you time? Consider [sponsoring me on GitHub](https://github.com/sponsors/mackenly)!
