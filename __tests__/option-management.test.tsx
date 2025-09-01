import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';

// Test component to isolate option management logic
function TestOptionManager({ initialOptions = ["", ""] }: { initialOptions?: string[] }) {
  const [options, setOptions] = useState<string[]>(initialOptions);

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  return (
    <div>
      <div data-testid="options-container">
        {options.map((option, index) => (
          <div key={index} data-testid={`option-${index}`}>
            <input
              data-testid={`option-input-${index}`}
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`Option ${index + 1}`}
            />
            {options.length > 2 && (
              <button
                data-testid={`remove-option-${index}`}
                onClick={() => removeOption(index)}
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
      <button 
        data-testid="add-option"
        onClick={addOption}
        disabled={options.length >= 10}
      >
        Add Option
      </button>
      <div data-testid="options-count">{options.length}</div>
    </div>
  );
}

describe('Option Management Logic', () => {
  describe('Add Option Functionality', () => {
    it('should add a new empty option to the list', () => {
      render(<TestOptionManager initialOptions={["Option 1", "Option 2"]} />);
      
      const addButton = screen.getByTestId('add-option');
      fireEvent.click(addButton);
      
      const options = screen.getAllByTestId(/^option-input-/);
      expect(options).toHaveLength(3);
      expect(screen.getByTestId('option-input-2')).toHaveValue('');
    });

    it('should not exceed maximum of 10 options', () => {
      render(<TestOptionManager initialOptions={Array(10).fill('Test')} />);
      
      const addButton = screen.getByTestId('add-option');
      expect(addButton).toBeDisabled();
      
      fireEvent.click(addButton);
      const options = screen.getAllByTestId(/^option-input-/);
      expect(options).toHaveLength(10);
    });

    it('should maintain existing values when adding new option', () => {
      render(<TestOptionManager initialOptions={["First", "Second"]} />);
      
      const addButton = screen.getByTestId('add-option');
      fireEvent.click(addButton);
      
      expect(screen.getByTestId('option-input-0')).toHaveValue('First');
      expect(screen.getByTestId('option-input-1')).toHaveValue('Second');
      expect(screen.getByTestId('option-input-2')).toHaveValue('');
    });
  });

  describe('Remove Option Functionality', () => {
    it('should remove option at specified index', () => {
      render(<TestOptionManager initialOptions={["A", "B", "C", "D"]} />);
      
      const removeButton = screen.getByTestId('remove-option-2');
      fireEvent.click(removeButton);
      
      const options = screen.getAllByTestId(/^option-input-/);
      expect(options).toHaveLength(3);
      expect(screen.getByTestId('option-input-0')).toHaveValue('A');
      expect(screen.getByTestId('option-input-1')).toHaveValue('B');
      expect(screen.getByTestId('option-input-2')).toHaveValue('D');
    });

    it('should not allow removal when only 2 options remain', () => {
      render(<TestOptionManager initialOptions={["Only", "Two"]} />);
      
      const removeButtons = screen.queryAllByTestId(/^remove-option-/);
      expect(removeButtons).toHaveLength(0);
    });

    it('should handle edge case: removing from middle of list', () => {
      render(<TestOptionManager initialOptions={["1", "2", "3", "4", "5"]} />);
      
      const removeButton = screen.getByTestId('remove-option-2');
      fireEvent.click(removeButton);
      
      const options = screen.getAllByTestId(/^option-input-/);
      expect(options).toHaveLength(4);
      expect(screen.getByTestId('option-input-0')).toHaveValue('1');
      expect(screen.getByTestId('option-input-1')).toHaveValue('2');
      expect(screen.getByTestId('option-input-2')).toHaveValue('4');
      expect(screen.getByTestId('option-input-3')).toHaveValue('5');
    });
  });

  describe('Update Option Functionality', () => {
    it('should update option value at specified index', () => {
      render(<TestOptionManager initialOptions={["Original 1", "Original 2"]} />);
      
      const input = screen.getByTestId('option-input-1');
      fireEvent.change(input, { target: { value: 'Updated Option' } });
      
      expect(screen.getByTestId('option-input-1')).toHaveValue('Updated Option');
      expect(screen.getByTestId('option-input-0')).toHaveValue('Original 1');
    });

    it('should handle empty string updates', () => {
      render(<TestOptionManager initialOptions={["Valid Option", "Another"]} />);
      
      const input = screen.getByTestId('option-input-0');
      fireEvent.change(input, { target: { value: '' } });
      
      expect(screen.getByTestId('option-input-0')).toHaveValue('');
    });

    it('should handle special characters in option text', () => {
      render(<TestOptionManager initialOptions={["Normal"]} />);
      
      const input = screen.getByTestId('option-input-0');
      const specialText = 'Option with @#$%&*()_+-=[]{}|;:,.<>?';
      fireEvent.change(input, { target: { value: specialText } });
      
      expect(screen.getByTestId('option-input-0')).toHaveValue(specialText);
    });
  });

  describe('Edge Cases and Boundaries', () => {
    it('should handle rapid add/remove operations', () => {
      render(<TestOptionManager initialOptions={["A", "B"]} />);
      
      const addButton = screen.getByTestId('add-option');
      const removeButtons = () => screen.queryAllByTestId(/^remove-option-/);
      
      // Add 3 options
      for (let i = 0; i < 3; i++) {
        fireEvent.click(addButton);
      }
      
      expect(screen.getAllByTestId(/^option-input-/)).toHaveLength(5);
      
      // Remove 2 options
      const removes = removeButtons();
      fireEvent.click(removes[0]);
      fireEvent.click(removeButtons()[0]);
      
      expect(screen.getAllByTestId(/^option-input-/)).toHaveLength(3);
    });

    it('should maintain state consistency', () => {
      const { container } = render(<TestOptionManager />);
      
      const addButton = screen.getByTestId('add-option');
      
      // Add 5 options
      for (let i = 0; i < 5; i++) {
        fireEvent.click(addButton);
      }
      
      expect(screen.getByTestId('options-count')).toHaveTextContent('7'); // 2 initial + 5
      
      // Remove 3 options
      const removeButtons = screen.queryAllByTestId(/^remove-option-/);
      for (let i = 0; i < 3; i++) {
        if (removeButtons[i]) {
          fireEvent.click(removeButtons[i]);
        }
      }
      
      expect(screen.getByTestId('options-count')).toHaveTextContent('4');
    });
  });
});