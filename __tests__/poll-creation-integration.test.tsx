import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreatePollForm from '../app/polls/create/page';
import { createPoll } from '../lib/database';
import { notificationManager } from '../lib/utils/notifications';

// Mock all dependencies
jest.mock('../app/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123', email: 'test@example.com' },
  }),
}));

jest.mock('../lib/database', () => ({
  createPoll: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

jest.mock('../lib/utils/notifications', () => ({
  notificationManager: {
    addNotification: jest.fn(),
  },
}));

// Mock Supabase auth helpers
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user-123' } } },
        error: null,
      }),
    },
  })),
}));

describe('Poll Creation Integration', () => {
  let mockCreatePoll: jest.MockedFunction<typeof createPoll>;
  let mockAddNotification: jest.MockedFunction<typeof notificationManager.addNotification>;
  let mockRouterPush: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreatePoll = createPoll as jest.MockedFunction<typeof createPoll>;
    mockAddNotification = notificationManager.addNotification as jest.MockedFunction<typeof notificationManager.addNotification>;
    mockRouterPush = require('next/navigation').useRouter().push;
  });

  describe('Complete Poll Creation Flow', () => {
    it('should successfully create a poll with comprehensive validation and data integrity', async () => {
      const mockPoll = {
        id: 'poll-123',
        title: 'Integration Test Poll',
        description: 'This is a test poll for integration testing',
        options: [
          { id: 'opt-1', text: 'JavaScript', votes: 0 },
          { id: 'opt-2', text: 'Python', votes: 0 },
          { id: 'opt-3', text: 'TypeScript', votes: 0 },
        ],
        created_at: new Date().toISOString(),
        user_id: 'test-user-123',
      };

      mockCreatePoll.mockResolvedValue(mockPoll);

      const { container } = render(<CreatePollForm />);

      // Verify form is initially in ready state
      expect(screen.getByText('Create Poll')).toBeEnabled();
      expect(screen.queryByText('Creating Poll...')).not.toBeInTheDocument();

      // Fill in the form with comprehensive data
      const titleInput = screen.getByPlaceholderText("What's your favorite programming language?");
      const descriptionInput = screen.getByPlaceholderText('Add context or details about your poll...');
      
      await userEvent.type(titleInput, 'Integration Test Poll');
      await userEvent.type(descriptionInput, 'This is a test poll for integration testing');

      // Verify character limits and field states
      expect(titleInput).toHaveValue('Integration Test Poll');
      expect(descriptionInput).toHaveValue('This is a test poll for integration testing');

      // Add and manage multiple options
      const addButton = screen.getByText('Add Another Option');
      fireEvent.click(addButton);

      // Verify option count increased
      const optionInputs = screen.getAllByPlaceholderText(/Option \d+/);
      expect(optionInputs).toHaveLength(3);

      // Fill all options with edge case data
      await userEvent.type(optionInputs[0], 'JavaScript');
      await userEvent.type(optionInputs[1], 'Python');
      await userEvent.type(optionInputs[2], 'TypeScript');

      // Verify all inputs have correct values
      expect(optionInputs[0]).toHaveValue('JavaScript');
      expect(optionInputs[1]).toHaveValue('Python');
      expect(optionInputs[2]).toHaveValue('TypeScript');

      // Submit the form and verify loading state
      const submitButton = screen.getByText('Create Poll');
      fireEvent.click(submitButton);

      // Verify loading state appears
      expect(screen.getByText('Creating Poll...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();

      // Verify API call with exact data structure
      await waitFor(() => {
        expect(mockCreatePoll).toHaveBeenCalledTimes(1);
        expect(mockCreatePoll).toHaveBeenCalledWith({
          title: 'Integration Test Poll',
          description: 'This is a test poll for integration testing',
          options: ['JavaScript', 'Python', 'TypeScript'],
        });
      });

      // Verify success notification with exact payload
      expect(mockAddNotification).toHaveBeenCalledWith({
        type: 'success',
        title: 'Poll Created!',
        message: 'Your poll has been created successfully',
        duration: 5000,
      });

      // Verify navigation to correct poll page
      expect(mockRouterPush).toHaveBeenCalledWith('/polls/poll-123');
      expect(mockRouterPush).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Database connection failed';
      mockCreatePoll.mockRejectedValue(new Error(errorMessage));

      render(<CreatePollForm />);

      // Fill minimal valid data
      await userEvent.type(
        screen.getByPlaceholderText("What's your favorite programming language?"),
        'Error Test Poll'
      );
      
      await userEvent.type(
        screen.getByPlaceholderText('Add context or details about your poll...'),
        'Testing error handling'
      );

      const optionInputs = screen.getAllByPlaceholderText(/Option \d+/);
      await userEvent.type(optionInputs[0], 'Option 1');
      await userEvent.type(optionInputs[1], 'Option 2');

      // Submit
      fireEvent.click(screen.getByText('Create Poll'));

      await waitFor(() => {
        expect(mockAddNotification).toHaveBeenCalledWith({
          type: 'error',
          title: 'Error Creating Poll',
          message: errorMessage,
          duration: 8000,
        });
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should handle validation errors before API call', async () => {
      render(<CreatePollForm />);

      // Submit empty form
      fireEvent.click(screen.getByText('Create Poll'));

      // Should show validation errors
      await waitFor(() => {
        expect(mockAddNotification).toHaveBeenCalledWith({
          type: 'error',
          title: 'Validation Error',
          message: expect.stringContaining('Please fix the errors'),
          duration: 5000,
        });
      });

      expect(mockCreatePoll).not.toHaveBeenCalled();
    });

    it('should handle authentication errors during submission', async () => {
      // Mock authentication failure
      const { createClientComponentClient } = require('@supabase/auth-helpers-nextjs');
      createClientComponentClient().auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Session expired'),
      });

      render(<CreatePollForm />);

      // Fill form
      await userEvent.type(
        screen.getByPlaceholderText("What's your favorite programming language?"),
        'Auth Test Poll'
      );
      await userEvent.type(screen.getAllByPlaceholderText(/Option \d+/)[0], 'Option 1');
      await userEvent.type(screen.getAllByPlaceholderText(/Option \d+/)[1], 'Option 2');

      // Submit
      fireEvent.click(screen.getByText('Create Poll'));

      await waitFor(() => {
        expect(mockAddNotification).toHaveBeenCalledWith({
          type: 'error',
          title: 'Session Expired',
          message: 'Your session has expired. Please login again to continue.',
          duration: 8000,
        });
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/auth/login?redirectTo=/polls/create');
    });
  });

  describe('User Experience Flow', () => {
    it('should show loading state during submission', async () => {
      mockCreatePoll.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

      render(<CreatePollForm />);

      // Fill minimal valid data
      await userEvent.type(screen.getByPlaceholderText("What's your favorite programming language?"), 'Loading Test');
      await userEvent.type(screen.getAllByPlaceholderText(/Option \d+/)[0], 'Option 1');
      await userEvent.type(screen.getAllByPlaceholderText(/Option \d+/)[1], 'Option 2');

      const submitButton = screen.getByText('Create Poll');
      fireEvent.click(submitButton);

      expect(screen.getByText('Creating Poll...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByText('Creating Poll...')).not.toBeInTheDocument();
      });
    });

    it('should reset form after successful creation', async () => {
      const mockPoll = { id: 'poll-456', title: 'Reset Test Poll' };
      mockCreatePoll.mockResolvedValue(mockPoll);

      render(<CreatePollForm />);

      // Fill form
      const titleInput = screen.getByPlaceholderText("What's your favorite programming language?");
      await userEvent.type(titleInput, 'Reset Test Poll');
      await userEvent.type(screen.getByPlaceholderText('Add context or details about your poll...'), 'Test description');
      await userEvent.type(screen.getAllByPlaceholderText(/Option \d+/)[0], 'Option 1');

      // Submit
      fireEvent.click(screen.getByText('Create Poll'));

      await waitFor(() => {
        expect(titleInput).toHaveValue('');
        expect(screen.getByPlaceholderText('Add context or details about your poll...')).toHaveValue('');
        expect(screen.getAllByPlaceholderText(/Option \d+/)[0]).toHaveValue('');
        expect(screen.getAllByPlaceholderText(/Option \d+/)[1]).toHaveValue('');
      });
    });
  });
});