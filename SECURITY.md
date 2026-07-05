# Security policy

## Supported versions

Security fixes are applied to the latest version on the `main` branch.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting for this repository when it is available. Do not
open a public issue containing exploit details, private log data, callsigns, exported ADIF files,
or other personal information.

If private reporting is unavailable, open a public issue containing only a general description
and ask the maintainers to arrange a private channel for the details.

Include the affected version or commit, reproduction steps, expected impact, and any suggested
mitigation. Please allow a reasonable period for investigation and a release before public
disclosure.

## Privacy model

FieldLog has no backend and makes no runtime requests to third-party services. QSO and session
data are stored in the browser's IndexedDB and leave the device only when the user explicitly
exports an ADIF file. Reports should call out any behavior that violates these guarantees.
