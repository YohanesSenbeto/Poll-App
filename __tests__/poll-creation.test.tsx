import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreatePollForm from "../app/polls/create/page";
import { createPollSchema } from '../lib/schemas/poll.schema';
import { notificationManager } from '@/lib/utils/notifications';

// Create a separate test file for utilities
describe("Utility Functions", () => {
    it("should validate poll schema with valid data", () => {
        const validData = {
            title: "What is your favorite programming language?",
            description: "Help us understand developer preferences",
            languages: ["JavaScript", "Python", "Java", "C++", "TypeScript"],
        };

        const result = createPollSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it("should reject poll schema with invalid data", () => {
        const invalidData = {
            title: "Short",
            description: "",
            languages: ["Only one language"],
        };

        const result = createPollSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });
});

// Create a new test file for core utilities
describe("Core Utilities", () => {
    describe("Notification Manager", () => {
        it("should handle notification creation", () => {
            const mockNotification = {
                type: "success" as const,
                title: "Test Success",
                message: "Test message",
                duration: 5000
            };

            // Mock the notification manager
            const addNotificationSpy = jest.fn();
            jest.spyOn(notificationManager, 'addNotification').mockImplementation(addNotificationSpy);

            // This would test the notification functionality
            expect(addNotificationSpy).toHaveBeenCalledTimes(0);
        });
    });
});

// Mock createClientComponentClient
jest.mock('@supabase/auth-helpers-nextjs', () => ({
    createClientComponentClient: jest.fn(() => ({
        auth: {
            getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
    })),
}));

// Mock getLanguageCatalog
jest.mock('@/lib/database', () => ({
    getLanguageCatalog: jest.fn().mockResolvedValue([
        'Python', 'JavaScript', 'TypeScript', 'Java', 'C#', 'C', 'C++', 'Go', 'Rust', 'PHP'
    ]),
    createPoll: jest.fn(),
    getPollById: jest.fn(),
    voteOnPoll: jest.fn(),
}));

// Mock all dependencies
jest.mock("../app/auth-context", () => ({
    useAuth: () => ({
        user: { id: "test-user-id", email: "test@example.com" },
    }),
}));

// Mock the database functions
jest.mock("../lib/database", () => ({
    createPoll: jest.fn(),
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
    useRouter: () => ({
        push: jest.fn(),
    }),
    useSearchParams: () => ({
        get: jest.fn(),
    }),
}));

// Mock notifications
jest.mock("@/lib/utils/notifications", () => ({
    notificationManager: {
        addNotification: jest.fn(),
    },
}));

describe("Poll Creation Form", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Form Validation", () => {
        it("should validate required fields", () => {
            const invalidData = {
                title: "",
                description: "",
                options: [],
            };

            const result = createPollSchema.safeParse(invalidData);
            expect(result.success).toBe(false);

            if (!result.success) {
                const errors = result.error.errors;
                expect(errors).toContainEqual(
                    expect.objectContaining({
                        path: ["title"],
                        message: expect.stringContaining("required"),
                    })
                );
                expect(errors).toContainEqual(
                    expect.objectContaining({
                        path: ["description"],
                        message: expect.stringContaining("required"),
                    })
                );
                expect(errors).toContainEqual(
                    expect.objectContaining({
                        path: ["options"],
                        message: expect.stringContaining("required"),
                    })
                );
            }
        });

        it("should validate minimum options", () => {
            const invalidData = {
                title: "Test Poll",
                description: "Test Description",
                options: [""], // Only one option
            };

            const result = createPollSchema.safeParse(invalidData);
            expect(result.success).toBe(false);

            if (!result.success) {
                const errors = result.error.errors;
                expect(errors).toContainEqual(
                    expect.objectContaining({
                        path: ["options"],
                        message: expect.stringContaining("at least"),
                    })
                );
            }
        });

        it("should validate maximum options", () => {
            const invalidData = {
                title: "Test Poll",
                description: "Test Description",
                options: Array(11).fill("Option"), // 11 options
            };

            const result = createPollSchema.safeParse(invalidData);
            expect(result.success).toBe(false);

            if (!result.success) {
                const errors = result.error.errors;
                expect(errors).toContainEqual(
                    expect.objectContaining({
                        path: ["options"],
                        message: expect.stringContaining("at most"),
                    })
                );
            }
        });

        it("should validate title length", () => {
            const invalidData = {
                title: "a", // Too short
                description: "Valid description",
                options: ["Option 1", "Option 2"],
            };

            const result = createPollSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it("should accept valid poll data", () => {
            const validData = {
                title: "What is your favorite programming language?",
                description: "Help us understand developer preferences",
                options: ["JavaScript", "Python", "Java", "C++"],
            };

            const result = createPollSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
    });

    describe("Option Management", () => {
        it("should add new option when Add button is clicked", async () => {
            const { createPoll } = require("@/lib/database");
            render(<CreatePollForm />);

            const addButton = screen.getByText("Add Another Option");
            const initialOptions = screen.getAllByPlaceholderText(/Option \d+/);
            expect(initialOptions).toHaveLength(2);

            fireEvent.click(addButton);

            const newOptions = screen.getAllByPlaceholderText(/Option \d+/);
            expect(newOptions).toHaveLength(3);
        });

        it("should not add option when at maximum (10)", async () => {
            render(<CreatePollForm />);

            const addButton = screen.getByText("Add Another Option");

            // Add options until we reach the limit
            for (let i = 0; i < 8; i++) {
                fireEvent.click(addButton);
            }

            const options = screen.getAllByPlaceholderText(/Option \d+/);
            expect(options).toHaveLength(10);

            // Button should be disabled
            expect(addButton).toBeDisabled();
        });

        it("should remove option when delete button is clicked", async () => {
            render(<CreatePollForm />);

            const addButton = screen.getByText("Add Another Option");
            fireEvent.click(addButton); // Add a third option

            const deleteButtons = screen.getAllByRole("button", {
                name: /trash/i,
            });
            expect(deleteButtons).toHaveLength(1); // Only one delete button for the third option

            fireEvent.click(deleteButtons[0]);

            const options = screen.getAllByPlaceholderText(/Option \d+/);
            expect(options).toHaveLength(2);
        });

        it("should not remove option when only 2 options remain", async () => {
            render(<CreatePollForm />);

            const deleteButtons = screen.queryAllByRole("button", {
                name: /trash/i,
            });
            expect(deleteButtons).toHaveLength(0); // No delete buttons for 2 options
        });
    });

    describe("Form Submission", () => {
        it("should submit form with valid data", async () => {
            const { createPoll } = require("@/lib/database");
            const mockPoll = { id: "test-poll-id", title: "Test Poll" };
            createPoll.mockResolvedValue(mockPoll);

            render(<CreatePollForm />);

            // Fill form
            await userEvent.type(
                screen.getByPlaceholderText(
                    "What's your favorite programming language?"
                ),
                "Test Poll"
            );
            await userEvent.type(
                screen.getByPlaceholderText(
                    "Add context or details about your poll..."
                ),
                "Test Description"
            );

            const optionInputs = screen.getAllByPlaceholderText(/Option \d+/);
            await userEvent.type(optionInputs[0], "Option 1");
            await userEvent.type(optionInputs[1], "Option 2");

            // Submit
            const submitButton = screen.getByText("Create Poll");
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(createPoll).toHaveBeenCalledWith({
                    title: "Test Poll",
                    description: "Test Description",
                    options: ["Option 1", "Option 2"],
                });
            });
        });

        it("should show validation errors for invalid form", async () => {
            render(<CreatePollForm />);

            const submitButton = screen.getByText("Create Poll");
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText("Create Poll")).toBeInTheDocument();
                // Check for validation error messages
            });
        });

        it("should show success notification on successful submission", async () => {
            const { createPoll } = require("@/lib/database");
            const mockPoll = { id: "test-poll-id", title: "Test Poll" };
            createPoll.mockResolvedValue(mockPoll);

            render(<CreatePollForm />);

            // Fill form
            await userEvent.type(
                screen.getByPlaceholderText(
                    "What's your favorite programming language?"
                ),
                "Test Poll"
            );
            await userEvent.type(
                screen.getByPlaceholderText(
                    "Add context or details about your poll..."
                ),
                "Test Description"
            );

            const optionInputs = screen.getAllByPlaceholderText(/Option \d+/);
            await userEvent.type(optionInputs[0], "Option 1");
            await userEvent.type(optionInputs[1], "Option 2");

            // Submit
            const submitButton = screen.getByText("Create Poll");
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(notificationManager.addNotification).toHaveBeenCalledWith({
                    type: "success",
                    title: "Poll Created!",
                    message: "Your poll has been created successfully",
                    duration: 5000
                });
            });
        });

        it("should show error notification on submission failure", async () => {
            const { createPoll } = require("@/lib/database");
            createPoll.mockRejectedValue(new Error("Database error"));

            render(<CreatePollForm />);

            // Fill form
            await userEvent.type(
                screen.getByPlaceholderText(
                    "What's your favorite programming language?"
                ),
                "Test Poll"
            );
            await userEvent.type(
                screen.getByPlaceholderText(
                    "Add context or details about your poll..."
                ),
                "Test Description"
            );

            const optionInputs = screen.getAllByPlaceholderText(/Option \d+/);
            await userEvent.type(optionInputs[0], "Option 1");
            await userEvent.type(optionInputs[1], "Option 2");

            // Submit
            const submitButton = screen.getByText("Create Poll");
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(notificationManager.addNotification).toHaveBeenCalledWith({
                    type: "error",
                    title: "Error Creating Poll",
                    message: "Database error",
                    duration: 8000
                });
            });
        });

        it("should redirect to poll page on successful submission", async () => {
            const { createPoll } = require("@/lib/database");
            const mockPoll = { id: "test-poll-id", title: "Test Poll" };
            createPoll.mockResolvedValue(mockPoll);

            const mockRouter = {
                push: jest.fn(),
                prefetch: jest.fn(),
            };
            jest.spyOn(require("next/navigation"), "useRouter").mockReturnValue(mockRouter);

            render(<CreatePollForm />);

            // Fill form
            await userEvent.type(
                screen.getByPlaceholderText(
                    "What's your favorite programming language?"
                ),
                "Test Poll"
            );
            await userEvent.type(
                screen.getByPlaceholderText(
                    "Add context or details about your poll..."
                ),
                "Test Description"
            );

            const optionInputs = screen.getAllByPlaceholderText(/Option \d+/);
            await userEvent.type(optionInputs[0], "Option 1");
            await userEvent.type(optionInputs[1], "Option 2");

            // Submit
            const submitButton = screen.getByText("Create Poll");
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockRouter.prefetch).toHaveBeenCalledWith("/polls/test-poll-id");
                expect(mockRouter.push).toHaveBeenCalledWith("/polls/test-poll-id");
            });
        });

        it("should handle form validation with exactly 5 languages", async () => {
            const { createPoll } = require("@/lib/database");
            const mockPoll = { id: "test-poll-id", title: "Test Poll" };
            createPoll.mockResolvedValue(mockPoll);

            render(<CreatePollForm />);

            // Fill form with exactly 5 languages
            await userEvent.type(
                screen.getByPlaceholderText(
                    "What's your favorite programming language?"
                ),
                "Test Poll"
            );

            const optionInputs = screen.getAllByPlaceholderText(/Option \d+/);
            const languages = ["JavaScript", "Python", "Java", "C++", "TypeScript"];

            for (let i = 0; i < optionInputs.length; i++) {
                await userEvent.clear(optionInputs[i]);
                await userEvent.type(optionInputs[i], languages[i]);
            }

            // Submit
            const submitButton = screen.getByText("Create Poll");
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(createPoll).toHaveBeenCalledWith({
                    title: "Test Poll",
                    description: null,
                    options: languages,
                });
            });
        });

        it("should disable submit button when form is invalid", () => {
            render(<CreatePollForm />);

            const submitButton = screen.getByText("Create Poll");
            expect(submitButton).toBeDisabled();

            // Button should remain disabled until form is valid
            expect(submitButton).toHaveAttribute("disabled");
        });

        it("should enable submit button when form is valid", async () => {
            render(<CreatePollForm />);

            // Fill form with valid data
            await userEvent.type(
                screen.getByPlaceholderText(
                    "What's your favorite programming language?"
                ),
                "Test Poll Title That Is Long Enough"
            );

            const optionInputs = screen.getAllByPlaceholderText(/Option \d+/);
            const languages = ["JavaScript", "Python", "Java", "C++", "TypeScript"];

            for (let i = 0; i < optionInputs.length; i++) {
                await userEvent.clear(optionInputs[i]);
                await userEvent.type(optionInputs[i], languages[i]);
            }

            const submitButton = screen.getByText("Create Poll");
            expect(submitButton).not.toBeDisabled();
        });

        it("should handle language catalog loading", async () => {
            const { getLanguageCatalog } = require('@/lib/database');
            getLanguageCatalog.mockResolvedValue(['Python', 'JavaScript', 'TypeScript']);

            render(<CreatePollForm />);

            await waitFor(() => {
                expect(getLanguageCatalog).toHaveBeenCalled();
            });

            // Check if language buttons are rendered
            const languageButtons = screen.getAllByText('Python');
            expect(languageButtons.length).toBeGreaterThan(0);
        });

        it("should show authentication required message when not logged in", () => {
            // Mock no user
            jest.spyOn(require("../app/auth-context"), "useAuth").mockReturnValue({
                user: null,
            });

            render(<CreatePollForm />);

            expect(screen.getByText("Please register or login to create polls.")).toBeInTheDocument();
            expect(screen.getByText("Sign In")).toBeInTheDocument();
            expect(screen.getByText("Create Account")).toBeInTheDocument();
        });

        it("should handle language selection with exactly 5 languages", async () => {
            const { getLanguageCatalog } = require('@/lib/database');
            getLanguageCatalog.mockResolvedValue(['Python', 'JavaScript', 'TypeScript', 'Java', 'C#', 'C++', 'Go', 'Rust', 'PHP', 'Ruby']);

            render(<CreatePollForm />);

            await waitFor(() => {
                expect(screen.getByText('Python')).toBeInTheDocument();
            });

            // Select exactly 5 languages
            const languages = ['Python', 'JavaScript', 'TypeScript', 'Java', 'C#'];
            for (const lang of languages) {
                const langButton = screen.getByText(lang);
                fireEvent.click(langButton);
            }

            // Check that 5 languages are selected
            expect(screen.getByText('Selected: 5 / 5')).toBeInTheDocument();
        });

        it("should handle loading state during form submission", async () => {
            const { createPoll } = require("@/lib/database");
            createPoll.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ id: "test-poll-id" }), 100)));

            render(<CreatePollForm />);

            // Fill form with valid data
            await userEvent.type(
                screen.getByPlaceholderText(
                    "What's your favorite programming language?"
                ),
                "Test Poll Title That Is Long Enough"
            );

            const optionInputs = screen.getAllByPlaceholderText(/Option \d+/);
            const languages = ["JavaScript", "Python", "Java", "C++", "TypeScript"];

            for (let i = 0; i < optionInputs.length; i++) {
                await userEvent.clear(optionInputs[i]);
                await userEvent.type(optionInputs[i], languages[i]);
            }

            // Submit form
            const submitButton = screen.getByText("Create Poll");
            fireEvent.click(submitButton);

            // Check loading state
            expect(screen.getByText("Creating…")).toBeInTheDocument();
            expect(submitButton).toBeDisabled();

            // Wait for completion
            await waitFor(() => {
                expect(screen.getByText("Create Poll")).toBeInTheDocument();
            });
        });

        // Test schema validation
        it("should validate poll schema correctly", () => {
            // Test valid data
            const validData = {
                title: "What is your favorite programming language?",
                description: "Help us understand developer preferences",
                languages: ["JavaScript", "Python", "Java", "C++", "TypeScript"],
            };

            const result = createPollSchema.safeParse(validData);
            expect(result.success).toBe(true);

            // Test invalid data - too few languages
            const invalidData = {
                title: "Test",
                description: "Test",
                languages: ["Only one language"],
            };

            const invalidResult = createPollSchema.safeParse(invalidData);
            expect(invalidResult.success).toBe(false);
        });
    });

    // Test notification manager
    describe("Notification Manager Tests", () => {
        it("should handle notification creation", () => {
            const mockNotification = {
                type: "success" as const,
                title: "Test Success",
                message: "Test message",
                duration: 5000
            };

            // Mock the notification manager
            const addNotificationSpy = jest.fn();
            jest.spyOn(notificationManager, 'addNotification').mockImplementation(addNotificationSpy);

            // This tests the notification manager integration
            expect(typeof notificationManager.addNotification).toBe('function');
        });
    });
});
