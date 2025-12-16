import { Command } from 'commander';

export function planCommand() {
    const cmd = new Command('plan');
    cmd.description('Show what would happen when deploying (dry-run)');
    
    cmd.action(async () => {
        // TODO: Implement plan mode
        console.log('Plan mode coming soon...');
    });
    
    return cmd;
}

