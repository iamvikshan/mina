# v1.0.0 (2024-12-11)



## 1.0.0 (2024-12-11)

### Features

* Initial commit. rename updatelinks.yml to links-config.yml and update GitHub URLs; add CLA Assistant workflow and update linkapp workflow ([edad69f](https://github.com/iamvikshan/amina/commit/edad69f7c152af0e341f8b4b95d632fbe1303381))
- Better onboarding for new guilds.
- Added `/dev onboarding` command for triggering the settingsing for one or all
  guilds.
- Added `./src/commands/dev/dev.js` for ALL developer commands.
- Amina now responds in a more anime-like way to commands.
- Deleted codecov workflow
- added `./static-analysis.datadog.yml` for datadog static analysis
- `/bot changelog` command now pulls the bot's mini-changelog for the latest 3
  releases.
- Moved github configs to .env
- Updated dependencies.
- Lavalink configs are now in the env for security and easy updates.
- Renamed `./src/commands/developer` to `./src/commands/dev` and
  `./src/commands/information` to `./src/commands/info`
- Added sponsors workflow for GitHub sponsors
- Updated dependencies
- Add Voice channels support
- fix: upgrade mongoose from 7.3.4 to 8.0.0
- Fix contexts count always 0
- Renamed `./src/commands/moderation/shared` to
  `./src/commands/moderation/message`
- Amina now runs on Heroku
- Stats and invites will be tracked by default
- removed `npm run format` from the `npm run update` script to eliminate
      the possibility of formatting an already formatted code resulting in git
      errors
- excluded `docs` folder from `npm run format` script to prevent
      formatting the documentation files, which breaks links in gitbook.
-  Bot is now Amina
- Amina now has ToD
- Amina now has a changelog command
- Amina now can purge up to 500 messages
- 🗑️ Unnecessary commands removed

## Fixes & Improvements

- Fixed `require` to a `dynamic import` in `./src/commands/bot/bot.js` to fix
  the `/changelog` command not working.
- Fixed OWNER/DEV permissions not working.
- Fixed `/bot changelog` command not working.
- Fixed music module not working.
- Fixed Cannot read properties of undefined (reading 'find')
- Fix "Unknown Interaction" error when start a giveaway
- Fix help subcommands not loading
- fix music search bug
- Fix `move` command
- fixed rank card
- fix duplicate ranks
- fix invite ranks
- Fixed `leaderboard` command in which servers whose leaderboard is not
      set would send error instead of explaining it
- Fixed rank card username
- Fixed greeting fields can't be deleted in dashboard
- Fixed greeting fields not updating in dashboard
- Fixed anti-massmention
- Fixed null is not snowflake error
- Fixed command usage
- Fixed replit issues
- Fixed suggestion null
- Fixed Broken API links
