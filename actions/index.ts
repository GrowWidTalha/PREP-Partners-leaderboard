"use server";

import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from 'google-auth-library';
import googleAuth from "@/credientials.json";

interface QuizResponse {
    email: string;
    name: string;
    marks: number;
    totalMarks: number;
    quizName: string;
}

interface AggregatedResponses {
    [email: string]: {
        name: string;
        quizzes: { quizName: string; marks: number; totalMarks: number }[];
    };
}

const sheetConfigs = [
    {
        key: "1KwNBESXlwCPahMQTQO_7Ul3zBIUcusuwYu6RpD3Mc_A",
        name: "Name:",
        score: "Score",
        email: "Email Address",
        totalMarks: 20,
        quizName: "Class 06"
    },
    // {
    //     key: "1omVMRQX4gZLstaz2rWY-TZrpQPDOJpzDu9vAQj8WFbQ",
    //     name: "Name",
    //     score: "Score",
    //     email: "Email address",
    //     totalMarks: 40,
    //     quizName: "Class 05",
    // },
    // Add more sheet configurations as needed
];

const jwt = new JWT({
    email: process.env.GSHEETS_PRIVATE_KEY,
    key: process.env.CLIENT_EMAIL.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

function parseMarks(marks: string): [number, number] {
    const [achieved, total] = marks.split(' / ').map(Number);
    return [achieved, total];
}

async function fetchQuizResponses(sheetConfig: { key: string, name: string, score: string, email: string, totalMarks: number }, quizName: string): Promise<QuizResponse[]> {
    try {
        const doc = new GoogleSpreadsheet(sheetConfig.key, jwt);
        // await doc.useServiceAccountAuth(jwt); // Corrected method for JWT authentication
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0]; // Assuming data is in the first sheet
        const rows = await sheet.getRows();

        return rows.map((row) => {
            const [achieved, total] = parseMarks(row.get(sheetConfig.score)); // Corrected method to access row data
            return {
                email: row.get(sheetConfig.email), // Corrected method to access row data
                name: row.get(sheetConfig.name), // Corrected method to access row data
                marks: achieved,
                totalMarks: total,
                quizName: quizName,
            };
        });
    } catch (error: any) {
        throw new Error(error.message);
    }
}

export const aggregateResponses = async () => {
    const aggregatedResponses: AggregatedResponses = {};

    for (const config of sheetConfigs) {
        const responses = await fetchQuizResponses(config, config.quizName);

        responses.forEach((response) => {
            if (!aggregatedResponses[response.email]) {
                aggregatedResponses[response.email] = {
                    name: response.name,
                    quizzes: [],
                };
            }

            const existingQuiz = aggregatedResponses[response.email].quizzes.find(q => q.quizName === response.quizName);

            if (!existingQuiz) {
                aggregatedResponses[response.email].quizzes.push({
                    quizName: response.quizName,
                    marks: response.marks,
                    totalMarks: response.totalMarks,
                });
            }
        });
    }

    return aggregatedResponses;
}

// Utility functions

export const calculatePercentages = (aggregatedResponses: AggregatedResponses) => {
    const percentages: { email: string; name: string; percentage: number }[] = [];

    for (const email in aggregatedResponses) {
        const user = aggregatedResponses[email];
        let totalAchieved = 0;
        let totalPossible = 0;

        user.quizzes.forEach(quiz => {
            totalAchieved += quiz.marks;
            totalPossible += quiz.totalMarks;
        });

        const percentage = (totalAchieved / totalPossible) * 100;
        percentages.push({ email, name: user.name, percentage });
    }

    return percentages;
};

export const getTopTen = (percentages: { email: string; name: string; percentage: number }[]) => {
    let perc =  percentages.sort((a, b) => b.percentage - a.percentage).slice(0, 10)
    console.log(perc);
    
    return perc;
};

export const getUserDataByEmail = (aggregatedResponses: any, email: string) => {
    return aggregatedResponses[email] || null;
};

// Call aggregateResponses for testing purposes
// aggregateResponses().catch(console.error);
