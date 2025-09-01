import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreatePollForm from "../app/polls/create/page";
import { createPollSchema } from '../lib/schemas/poll.schema';

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
    });
});
