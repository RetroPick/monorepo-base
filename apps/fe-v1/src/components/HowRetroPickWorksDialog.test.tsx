import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HowRetroPickWorksDialog from "@/components/HowRetroPickWorksDialog";
import { HOW_RETRO_PICK_WORKS_STEPS, HOW_RETRO_PICK_WORKS_TITLE } from "@/lib/market-data/howRetroPickWorksContent";

describe("HowRetroPickWorksDialog", () => {
  it("steps through titles and exposes developer notes when present", () => {
    const onOpenChange = vi.fn();
    render(<HowRetroPickWorksDialog open onOpenChange={onOpenChange} />);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: HOW_RETRO_PICK_WORKS_TITLE })).toBeInTheDocument();
    expect(
      within(dialog).getByText(new RegExp(`Step 1 of ${HOW_RETRO_PICK_WORKS_STEPS.length}`)),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("heading", { name: HOW_RETRO_PICK_WORKS_STEPS[0].title, level: 3 }),
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /Technical details \(developers\)/i }));
    expect(within(dialog).getByText(/conditional tokens/i)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Next" }));
    expect(
      within(dialog).getByRole("heading", { name: HOW_RETRO_PICK_WORKS_STEPS[1].title, level: 3 }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(new RegExp(`Step 2 of ${HOW_RETRO_PICK_WORKS_STEPS.length}`)),
    ).toBeInTheDocument();
  });

  it("closes when Done is clicked on the last step", () => {
    const onOpenChange = vi.fn();
    render(<HowRetroPickWorksDialog open onOpenChange={onOpenChange} />);

    const dialog = screen.getByRole("dialog");
    const n = HOW_RETRO_PICK_WORKS_STEPS.length;
    for (let i = 0; i < n - 1; i += 1) {
      fireEvent.click(within(dialog).getByRole("button", { name: "Next" }));
    }
    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("resets to step 1 when reopened", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<HowRetroPickWorksDialog open onOpenChange={onOpenChange} />);
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Next" }));
      expect(
        within(dialog).getByText(new RegExp(`Step 2 of ${HOW_RETRO_PICK_WORKS_STEPS.length}`)),
      ).toBeInTheDocument();

    rerender(<HowRetroPickWorksDialog open={false} onOpenChange={onOpenChange} />);
    rerender(<HowRetroPickWorksDialog open onOpenChange={onOpenChange} />);

    const dialog2 = screen.getByRole("dialog");
    expect(
      within(dialog2).getByText(new RegExp(`Step 1 of ${HOW_RETRO_PICK_WORKS_STEPS.length}`)),
    ).toBeInTheDocument();
  });
});
