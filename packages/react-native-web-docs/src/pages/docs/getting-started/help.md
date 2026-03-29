---
title: Help
date: Last Modified
permalink: /docs/help/index.html
description: 
eleventyNavigation:
  key: Help
  parent: Start
  order: 7
---

:::lead
Questions? Looking for help? These are the best places to look first.
:::

## Before you ask

Checking these pages first often gives the fastest answer:

- [React Native compatibility]({{ '/docs/react-native-compatibility/' | url }})
- [TV Navigation]({{ '/docs/tv-navigation/' | url }})
- [TypeScript support]({{ '/docs/typescript-support/' | url }})

For TV-specific behavior, verify on your target browser/runtime and include those details when asking for help.

## Questions and design ideas

GitHub Discussions is not currently enabled for this fork.

For now, use [{{ site.name }} Issues on GitHub]({{ site.githubUrl }}/issues) and prefix the title with `question:` or `discussion:` for non-bug topics.

Use this path for:

- setup questions
- usage questions
- architecture and API ideas
- behavior that is unclear but not yet confirmed as a bug

If Discussions is enabled in the repository settings later, this page can be switched back to a dedicated Discussions link.

## Issues (bugs and feature requests)

[{{ site.name }} Issues on GitHub]({{ site.githubUrl }}/issues) is the place for reporting and resolving issues with {{ site.name }}.

Use Issues for:

- reproducible bugs
- feature requests
- documentation corrections

When opening a TV-related issue, include:

- target TV browser/runtime and device model
- remote/key input details (which keys or events are delivered)
- minimal reproduction (repo, snippet, or sandbox)
- expected behavior vs actual behavior

If the behavior appears to be baseline React Native Web behavior (not TV-layer specific), link or cross-reference the corresponding upstream issue when possible.

## Contributing fixes

Contributions are welcome. For branch model, test expectations, and PR checklist, see [Contributing](https://github.com/hps1978/react-native-web-tv/blob/tv-main/.github/CONTRIBUTING.md).

If you want to help with current gaps (for example TV parity edge cases or TV-specific TypeScript declarations), opening an issue first is the best way to align on scope.
