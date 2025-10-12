/**
 * Client Component Testing Example
 * This test demonstrates that client-side component testing works with the Jest environment
 */

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

// Simple test component
const TestButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const [clicked, setClicked] = React.useState(false);

  const handleClick = () => {
    setClicked(true);
    onClick?.();
  };

  return (
    <button data-testid="test-button" onClick={handleClick} className={clicked ? "clicked" : ""}>
      {clicked ? "Clicked!" : "Click me"}
    </button>
  );
};

describe("Client Component Testing", () => {
  it("should render a React component", () => {
    render(<TestButton />);
    expect(screen.getByTestId("test-button")).toBeInTheDocument();
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("should handle user interactions", () => {
    const mockClick = jest.fn();
    render(<TestButton onClick={mockClick} />);

    const button = screen.getByTestId("test-button");
    fireEvent.click(button);

    expect(mockClick).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Clicked!")).toBeInTheDocument();
  });

  it("should handle DOM manipulation", () => {
    render(<TestButton />);
    const button = screen.getByTestId("test-button");

    expect(button).not.toHaveClass("clicked");
    fireEvent.click(button);
    expect(button).toHaveClass("clicked");
  });

  it("should work with React hooks", () => {
    const TestHookComponent = () => {
      const [count, setCount] = React.useState(0);

      return (
        <div>
          <span data-testid="count">{count}</span>
          <button data-testid="increment" onClick={() => setCount(c => c + 1)}>
            Increment
          </button>
        </div>
      );
    };

    render(<TestHookComponent />);

    expect(screen.getByTestId("count")).toHaveTextContent("0");

    fireEvent.click(screen.getByTestId("increment"));
    expect(screen.getByTestId("count")).toHaveTextContent("1");

    fireEvent.click(screen.getByTestId("increment"));
    expect(screen.getByTestId("count")).toHaveTextContent("2");
  });
});
