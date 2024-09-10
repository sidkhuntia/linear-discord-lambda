import queryLinearAPI from '../../utils/queryLinearAPI';
import { parseLinearName } from '../../utils/helper';
import { MessageEmbed } from 'discord.js';
import { sendDiscordWebhook } from '../../utils/sendMessageToDiscord';


const DAILY_ISSUES_QUERY = {
    query: `
    {
      issues(filter: { updatedAt: { gte: "__TODAY_DATE__" } }) {
        nodes {
          id
          title
          createdAt
          updatedAt
          completedAt
          state {
            type
            name
          }
          assignee {
            id
            name
          }
        }
      }
    }
  `
};

interface Issue {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
    state: {
        type: string;
        name: string;
    };
    assignee: {
        id: string;
        name: string;
    } | null;
}

interface UserReport {
    completed: number;
    started: number;
    created: number;
}

interface DailyReport {
    overall: UserReport;
    userReports: { [key: string]: UserReport };
}

const get_user_name = (assignee: Issue['assignee']) => {
    if (assignee) {
        return parseLinearName(assignee.name);
    }
    return "Unassigned";
}

async function generateDailyReport(): Promise<DailyReport> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];

    const query = DAILY_ISSUES_QUERY.query.replace('__TODAY_DATE__', todayString);

    try {
        const response = await queryLinearAPI(query);
        const issues: Issue[] = response.data.issues.nodes;

        const report: DailyReport = {
            overall: { completed: 0, started: 0, created: 0 },
            userReports: {}
        };

        issues.forEach(issue => {
            const issueDateCreated = new Date(issue.createdAt);
            const issueDateCompleted = issue.completedAt ? new Date(issue.completedAt) : null;

            // Initialize user report if not exists
            if (issue.assignee && !report.userReports[get_user_name(issue.assignee)]) {
                report.userReports[get_user_name(issue.assignee)] = { completed: 0, started: 0, created: 0 };
            }

            // Check if created today
            if (issueDateCreated >= today) {
                report.overall.created++;
                if (issue.assignee) {
                    report.userReports[get_user_name(issue.assignee)].created++;
                }
            }

            // Check if completed today
            if (["completed"].includes(issue.state.type) && issueDateCompleted && issueDateCompleted >= today) {
                report.overall.completed++;
                if (issue.assignee) {
                    report.userReports[get_user_name(issue.assignee)].completed++;
                }
            }

            // Check if started today (moved to in progress or in review)
            if (["started"].includes(issue.state.type) && new Date(issue.updatedAt) >= today) {
                report.overall.started++;
                if (issue.assignee) {
                    report.userReports[get_user_name(issue.assignee)].started++;
                }
            }
        });

        return report;
    } catch (error) {
        console.error('Error fetching issues:', error);
        throw error;
    }
}

export default async function sendDailyReport() {
    try {
        const report = await generateDailyReport();
        const embed = createDailyReportEmbed(report);
        await sendDiscordWebhook({
            embed
        });
        return "Daily report sent successfully";
    } catch (error) {
        console.error('Failed to generate daily report:', error);
    }
}

export function createDailyReportEmbed(report: DailyReport): MessageEmbed {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    const embed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle(`Daily Report ${date.toLocaleDateString()}`)
        .setDescription('Summary of today\'s activities')
        .setTimestamp();

    // Add overall statistics
    let description = '**Overall Statistics**\n';
    description += '```';
    description += `✅ Completed: ${report.overall.completed}\n`;
    description += `🚀 Started: ${report.overall.started}\n`;
    description += `✨ Created: ${report.overall.created}\n\n`;
    description += '```';
    // Add user reports
    description += '**User Reports**\n';
    description += '```';
    Object.entries(report.userReports).forEach(([userId, userReport]) => {
        description += `${userId}:\n `;
        description += '----------------\n ';
        description += ` Completed: ${userReport.completed},\n `;
        description += ` Started: ${userReport.started},\n `;
        description += ` Created: ${userReport.created}\n\n`;
    });
    description += '```';

    embed.setDescription(description);

    return embed;
}
