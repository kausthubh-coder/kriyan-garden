# Brief 13 screen gallery

1 October 2026. Captures for Brief 21 are in [the gallery](../design/gallery/index.html), with PNGs and manifests beside it.

Web currently has 287 captures. These cover public pages, sliced landing, both 404 hosts, authentication, all five onboarding steps, empty and verified sample planners, task and goal properties, quick add, palette, shortcuts, feedback, settings, keyboard focus, reduced motion and actual browser zoom. Standard viewports are 1440 x 900 and 390 x 844. Every sample setup asserts 25 saved tasks before capture.

The two zoom captures use Chrome's actual zoom factor 2, verified with the extension API. The CSS zoom value remains 1. Their PNG dimensions are 720 x 450 and 252 x 422. Headless Chrome enforces a minimum window width for the narrow request; these are captioned separately from the standard viewport captures. The add-task dialog remains operable in both.

CLI has eight terminal captures from the real command runner with the approved sample fixture and test HTTP transport. No credentials are needed for this fixture. Text is rendered in preformatted blocks.

Android captures and the signed 1.0.1 smoke are waiting for EAS build `190704dd-1737-46a9-9bc0-739b628c6293`. The emulator will run with `-no-window -no-audio`. This report and the index will be updated after native verification.

The capture pass found a task-title validation bug, keyboard-inaccessible documentation tables, and planning labels that lose contrast on hover. Fixes and before/after evidence are recorded in [report 21](21-final-qa.md). The final index records missing states and verification limits explicitly. Test users are cleaned up after capture; the final two-deployment row audit is recorded in report 21.
