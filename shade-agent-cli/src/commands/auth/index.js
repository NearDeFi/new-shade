import { Command } from 'commander';
import select from '@inquirer/select';
import input from '@inquirer/input';
import confirm from '@inquirer/confirm';
import { getCredentials, setCredentials, hasCredentials, getPhalaKey, setPhalaKey, hasPhalaKey } from '../../utils/keystore.js';
import chalk from 'chalk';

export function authCommand() {
    const cmd = new Command('auth');
    cmd.description('Set up authentication credentials');
    
    // Define the set action function
    const setAction = async () => {
        try {
            // Ask what to set
            const whatToSet = await select({
                message: 'What would you like to set?',
                choices: [
                    { name: 'All (NEAR + PHALA)', value: 'both' },
                    { name: 'Just NEAR (network credentials)', value: 'network' },
                    { name: 'Just PHALA (API key)', value: 'phala' },
                ],
            });

            if (whatToSet === 'network' || whatToSet === 'both') {
                const network = await select({
                    message: 'Select network:',
                    choices: [
                        { name: 'Testnet', value: 'testnet' },
                        { name: 'Mainnet', value: 'mainnet' },
                    ],
                });

                // Check if credentials already exist
                const existing = await hasCredentials(network);
                if (existing) {
                    const replace = await confirm({
                        message: `Credentials for ${network} already exist. Replace them?`,
                        default: false,
                    });
                    if (!replace) {
                        console.log(chalk.yellow(`Skipping ${network} credentials`));
                    } else {
                        const accountId = await input({
                            message: 'Enter account ID:',
                            validate: (value) => {
                                if (!value || value.trim().length === 0) {
                                    return 'Account ID is required';
                                }
                                return true;
                            },
                        });
                        
                        const privateKey = await input({
                            message: 'Enter private key:',
                            validate: (value) => {
                                if (!value || value.trim().length === 0) {
                                    return 'Private key is required';
                                }
                                // Check if it's in the format ed25519:... or secp256k1:...
                                if (!value.startsWith('ed25519:') && !value.startsWith('secp256k1:')) {
                                    return 'Private key should start with "ed25519:" or "secp256k1:"';
                                }
                                return true;
                            },
                        });
                        
                        await setCredentials(network, accountId.trim(), privateKey.trim());
                        console.log(chalk.green(`✓ Credentials stored for ${network}`));
                        console.log(chalk.green(`\nStored credentials for ${network}:`));
                        console.log(chalk.cyan(`  Account ID: ${accountId.trim()}`));
                        console.log(chalk.cyan(`  Private Key: ${privateKey.trim()}`));
                    }
                } else {
                    const accountId = await input({
                        message: 'Enter account ID:',
                        validate: (value) => {
                            if (!value || value.trim().length === 0) {
                                return 'Account ID is required';
                            }
                            return true;
                        },
                    });
                    
                    const privateKey = await input({
                        message: 'Enter private key:',
                        validate: (value) => {
                            if (!value || value.trim().length === 0) {
                                return 'Private key is required';
                            }
                            // Check if it's in the format ed25519:... or secp256k1:...
                            if (!value.startsWith('ed25519:') && !value.startsWith('secp256k1:')) {
                                return 'Private key should start with "ed25519:" or "secp256k1:"';
                            }
                            return true;
                        },
                    });
                    
                    await setCredentials(network, accountId.trim(), privateKey.trim());
                    console.log(chalk.green(`✓ Credentials stored for ${network}`));
                    console.log(chalk.green(`\nStored credentials for ${network}:`));
                    console.log(chalk.cyan(`  Account ID: ${accountId.trim()}`));
                    console.log(chalk.cyan(`  Private Key: ${privateKey.trim()}`));
                }
            }

            if (whatToSet === 'phala' || whatToSet === 'both') {
                // Check if PHALA_KEY already exists
                const phalaExists = await hasPhalaKey();
                if (phalaExists) {
                    const replace = await confirm({
                        message: 'PHALA API key already exists. Replace it?',
                        default: false,
                    });
                    if (!replace) {
                        console.log(chalk.yellow('Skipping PHALA API key'));
                    } else {
                        const phalaKey = await input({
                            message: 'Enter PHALA API key:',
                            validate: (value) => {
                                if (!value || value.trim().length === 0) {
                                    return 'PHALA API key is required';
                                }
                                return true;
                            },
                        });
                        
                        const trimmedKey = phalaKey.trim();
                        await setPhalaKey(trimmedKey);
                        console.log(chalk.green('✓ PHALA API key stored'));
                        console.log(chalk.green('\nStored PHALA API key:'));
                        console.log(chalk.cyan(`  ${trimmedKey}`));
                    }
                } else {
                    const phalaKey = await input({
                        message: 'Enter PHALA API key:',
                        validate: (value) => {
                            if (!value || value.trim().length === 0) {
                                return 'PHALA API key is required';
                            }
                            return true;
                        },
                    });
                    
                    const trimmedKey = phalaKey.trim();
                    await setPhalaKey(trimmedKey);
                    console.log(chalk.green('✓ PHALA API key stored'));
                    console.log(chalk.green('\nStored PHALA API key:'));
                    console.log(chalk.cyan(`  ${trimmedKey}`));
                }
            }
        } catch (error) {
            // Handle SIGINT gracefully - exit silently
            if (error.name === 'ExitPromptError' || error.message?.includes('SIGINT')) {
                process.exit(0);
            }
            if (error.message && error.message.includes('libsecret')) {
                console.error(chalk.red('Error: libsecret is required on Linux.'));
                console.error(chalk.yellow('Please install it:'));
                console.error(chalk.yellow('  Debian/Ubuntu: sudo apt-get install libsecret-1-dev'));
                console.error(chalk.yellow('  Red Hat-based: sudo yum install libsecret-devel'));
                console.error(chalk.yellow('  Arch Linux: sudo pacman -S libsecret'));
            } else {
                console.error(chalk.red(`Error: ${error.message}`));
            }
            process.exit(1);
        }
    };
    
    // Define the get action function
    const getAction = async () => {
        try {
            const whatToGet = await select({
                message: 'What would you like to view?',
                choices: [
                    { name: 'All (NEAR + PHALA)', value: 'both' },
                    { name: 'Just NEAR (network credentials)', value: 'network' },
                    { name: 'Just PHALA (API key)', value: 'phala' },
                ],
            });

            if (whatToGet === 'network' || whatToGet === 'both') {
                const network = await select({
                    message: 'Select network:',
                    choices: [
                        { name: 'Testnet', value: 'testnet' },
                        { name: 'Mainnet', value: 'mainnet' },
                    ],
                });
                
                const credentials = await getCredentials(network);
                
                if (!credentials) {
                    console.log(chalk.yellow(`No credentials found for ${network}`));
                    console.log(chalk.yellow(`Use 'shade auth set' to store credentials`));
                } else {
                    console.log(chalk.green(`\nCredentials for ${network}:`));
                    console.log(chalk.cyan(`Account ID: ${credentials.accountId}`));
                    console.log(chalk.cyan(`Private Key: ${credentials.privateKey}`));
                }
            }

            if (whatToGet === 'phala' || whatToGet === 'both') {
                const phalaKey = await getPhalaKey();
                if (!phalaKey) {
                    console.log(chalk.yellow('\nNo PHALA API key found'));
                    console.log(chalk.yellow(`Use 'shade auth set' to store PHALA API key`));
                } else {
                    console.log(chalk.green('\nPHALA API key:'));
                    console.log(chalk.cyan(phalaKey));
                }
            }
        } catch (error) {
            // Handle SIGINT gracefully - exit silently
            if (error.name === 'ExitPromptError' || error.message?.includes('SIGINT')) {
                process.exit(0);
            }
            if (error.message && error.message.includes('libsecret')) {
                console.error(chalk.red('Error: libsecret is required on Linux.'));
                console.error(chalk.yellow('Please install it:'));
                console.error(chalk.yellow('  Debian/Ubuntu: sudo apt-get install libsecret-1-dev'));
                console.error(chalk.yellow('  Red Hat-based: sudo yum install libsecret-devel'));
                console.error(chalk.yellow('  Arch Linux: sudo pacman -S libsecret'));
            } else {
                console.error(chalk.red(`Error: ${error.message}`));
            }
            process.exit(1);
        }
    };
    
    // auth set command
    const setCmd = new Command('set');
    setCmd.description('Store credentials for a network');
    setCmd.action(setAction);
    
    // auth get command
    const getCmd = new Command('get');
    getCmd.description('Retrieve credentials for a network');
    getCmd.action(getAction);
    
    cmd.addCommand(setCmd);
    cmd.addCommand(getCmd);
    
    // Default action: show selector if no subcommand provided
    cmd.action(async () => {
        try {
            const subcommand = await select({
                message: 'What would you like to do?',
                choices: [
                    { name: 'Set - Store credentials for a network', value: 'set' },
                    { name: 'Get - Retrieve stored credentials', value: 'get' },
                ],
            });
            
            // Execute the selected subcommand action
            if (subcommand === 'get') {
                await getAction();
            } else if (subcommand === 'set') {
                await setAction();
            }
        } catch (error) {
            // Handle SIGINT gracefully - exit silently
            if (error.name === 'ExitPromptError' || error.message?.includes('SIGINT')) {
                process.exit(0);
            }
            throw error;
        }
    });
    
    return cmd;
}
