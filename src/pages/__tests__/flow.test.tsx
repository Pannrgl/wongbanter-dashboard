import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { expect, test } from "vitest";

import { App } from "../../App";

test("landing → register navigation works", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </MemoryRouter>
  );

  const cta = (await screen.findAllByRole("link", { name: /get free signals/i }))[0]!;
  await user.click(cta);

  expect(await screen.findByRole("heading", { name: /start your evaluation/i })).toBeInTheDocument();
});

test("register form validates required fields", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/register"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </MemoryRouter>
  );

  await user.click(screen.getByRole("button", { name: /create account/i }));

  expect(await screen.findByText(/nama lengkap wajib diisi/i)).toBeInTheDocument();
  expect(await screen.findByText(/email wajib diisi/i)).toBeInTheDocument();
  expect(await screen.findByText(/^password wajib diisi\.$/i)).toBeInTheDocument();
  expect(await screen.findByText(/konfirmasi password wajib diisi/i)).toBeInTheDocument();
  expect(await screen.findByText(/harus menyetujui ketentuan/i)).toBeInTheDocument();
});
