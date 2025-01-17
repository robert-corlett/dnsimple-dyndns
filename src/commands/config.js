const { Command, flags } = require('@oclif/command')
const Config = require('../lib/config')
const dnsimple = require('dnsimple')({})
const cli = require('cli-ux').default
const getIpAddress = require('../lib/ip-address')

class ConfigCommand extends Command {
  async run () {
    const configuration = new Config(this.config.configDir)
    const { flags } = this.parse(ConfigCommand)
    const quiet = flags.quiet
    let token = flags.token
    let domain = flags.domain
    let subDomain = flags.subDomain
    let accountId = null
    let recordId = null

    if (!token) {
      token = await cli.prompt('Please enter your DNSimple API Token. Generate from your account page, not from the user settings page. ', { type: 'mask' })
    }

    if (!domain) {
      domain = await cli.prompt('Please enter the domain name to target for DNS updates, excluding any sub-domain [domainname.com]')
    }

    let useSubDomain = false
    if ((!flags.token && !flags.domain) && !flags.subDomain) {
      useSubDomain = await cli.confirm('Are you using a sub-domain? [y/n]')
      if (useSubDomain) {
        subDomain = await cli.prompt('Enter the naked sub-domain [eg. enter "sub" for "sub.domain.com"]')
      }
    }

    dnsimple.setAccessToken(token)

    await dnsimple.identity.whoami().then(response => {
      accountId = response.data.account.id
    }).catch(error => {
      this.error(error.message, { exit: 1 })
    })

    if (useSubDomain) {
      await dnsimple.zones.listZoneRecords(accountId, domain, { name: subDomain }).then(response => {
        if (response.data.length === 1) {
          recordId = response.data[0].id
        }
      }).catch(error => {
        this.error(error.message, { exit: 1 })
      })
    } else {
      await dnsimple.zones.listZoneRecords(accountId, domain, { type: 'AAAA' }).then(response => {
        if (response.data.length > 0) {
          recordId = response.data.find(el => el.name === '').id
        }
      }).catch(error => {
        this.error(error.message, { exit: 1 })
      })
    }

    configuration.token = token
    configuration.accountId = accountId
    configuration.domainId = domain
    configuration.recordId = recordId
    configuration.recordName = subDomain
    configuration.ipAddress = await getIpAddress(this)
    configuration.updateConfig()

    if (!quiet) {
      this.log('Success! Configuration saved:')
      this.log(JSON.stringify(configuration.toJson(), null, '  '))
    }
  }
}

ConfigCommand.description = 'Run through the setup Wizard and create a configuration file'

ConfigCommand.flags = {
  quiet: flags.boolean({
    char: 'q',
    description: 'Do not display any output',
    required: false,
    default: false
  }),
  token: flags.string({
    char: 't',
    description: 'DNSimple API Token belonging to an account',
    required: false,
    default: null
  }),
  domain: flags.string({
    char: 'd',
    description: 'The domain name to target for DNS updates, excluding any sub-domain [domainname.com]',
    required: false,
    default: null
  }),
  subDomain: flags.string({
    char: 's',
    description: 'The naked sub-domain [eg. enter "sub" for "sub.domain.com"]',
    required: false,
    default: null
  })
}

module.exports = ConfigCommand
