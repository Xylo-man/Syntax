export const starterMessage = '# A little hello 👋\n\nWelcome to **your next great message**.\nMake an announcement, share an idea, or just\nsay something worth __noticing__.\n\n> Good conversations start with a few words.\n\nTry a little ||surprise||. You’ve got this.';
export const templates = [
  { title: 'Bring everyone together', name: 'Event announcement', icon: '✦', description: 'Game nights, watch parties, and everything in between.', text: '# You’re invited! 🎉\n\nJoin us for **[Event name]**!\n\n- **When:** [Insert a timestamp]\n- **Where:** [Channel or location]\n- **Bring:** Your good vibes\n\nReact with ✅ if you’re coming.\n-# Everyone’s welcome. See you there!' },
  { title: 'A friendly nudge', name: 'Reminder', icon: '◷', description: 'Keep an upcoming event or deadline on everyone’s radar.', text: '## A little reminder ⏰\n\n**[Event or deadline]** is coming up!\n\n> [Insert a timestamp for the date, time, or countdown]\n\nMake sure to [what people need to do].\n\nThanks, everyone! 💜' },
  { title: 'Keep your community in the loop', name: 'Maintenance notice', icon: '⚒', description: 'Clear expectations for a little scheduled downtime.', text: '## Scheduled maintenance 🔧\n\nWe’re making a few improvements to **[Service]**.\n\n- **Starts:** [Insert a timestamp]\n- **Expected duration:** [Duration]\n- **Affected:** [Features or channels]\n\nWe’ll update this message when everything is back.\n-# Thanks for your patience!' },
  { title: 'Make a good first impression', name: 'Server welcome', icon: '☀', description: 'A warm hello and a helpful place to start.', text: '# Welcome to [Server name]! 👋\n\nWe’re happy you’re here. Make yourself at home!\n\n1. Read the **server rules**.\n2. Pick your roles and introduce yourself.\n3. Find a conversation and jump in.\n\n> Be kind. Be curious. Be yourself.\n\nNeed a hand? Ask the moderation team. 💜' },
];
export const guide = [
  ['Bold', '**Stand out**', 'Wrap text in two asterisks.'],
  ['Italic', '*A little emphasis*', 'Wrap text in one asterisk.'],
  ['Underline', '__Worth noticing__', 'Wrap text in two underscores.'],
  ['Strikethrough', '~~Changed my mind~~', 'Wrap text in two tildes.'],
  ['Combined styles', '__**Extra emphasis**__', 'Nest formatting markers to combine styles.'],
  ['Spoiler', '||A little surprise||', 'Wrap text in two pipes. Click to reveal.'],
  ['Large heading', '# The big picture', 'Start a line with # followed by a space.'],
  ['Medium heading', '## A closer look', 'Start a line with ## followed by a space.'],
  ['Small heading', '### The details', 'Start a line with ### followed by a space.'],
  ['Subtext', '-# The little details.', 'Start a line with -# followed by a space.'],
  ['Bulleted list', '- First thing\n- Next thing\n  - A smaller thing', 'Use a dash and space; indent nested items by two spaces.'],
  ['Numbered list', '1. Start here\n2. Then this', 'Use a number, full stop, and space.'],
  ['Block quote', '> Something worth sharing.', 'Start each quoted line with > and a space.'],
  ['Multiline quote', '>>> One thought.\nA little more context.', '>>> and a space quotes the remaining message.'],
  ['Inline code', '`a little code`', 'Wrap short code in single backticks.'],
  ['Code block', '```js\nconst hello = "world";\n```', 'Use triple backticks; optionally add a language.'],
  ['Labelled link', '[Visit Discord](https://discord.com)', 'Put the label in brackets and the URL in parentheses.'],
  ['Escape formatting', '\\*Keep the asterisks\\*', 'Put a backslash before a formatting character.'],
  ['Localised timestamp', '<t:1793206800:f>', 'Unix seconds and a style letter. Create yours in Timestamps.'],
];
