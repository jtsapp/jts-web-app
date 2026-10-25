// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TeacherMatchingPanel from "./TeacherMatchingPanel.jsx";
import * as api from "../api.js";
vi.mock("../api.js", () => ({
  getMatchingCase: vi.fn(),
  saveMatchingPreferences: vi.fn(),
  askMatchingManager: vi.fn(),
  getMatchingCandidates: vi.fn(),
  sendMatchingRequests: vi.fn(),
  confirmMatchingSchedule: vi.fn(),
  requestTeacherChange: vi.fn(),
  getMatchingHandoffs: vi.fn(),
  chooseMatchingHandoff: vi.fn(),
}));
const card = () => ({
  matchStatus: "self",
  tariff: "General",
  lessonDuration: 60,
  lessonsPerWeek: 2,
  tariffConfirmed: true,
  availableSlots: [
    { weekday: 1, start: "11:00:00" },
    { weekday: 3, start: "11:00:00" },
  ],
  interests: [],
  history: [],
  requests: [],
  proposedSlots: [],
  finalSlots: [],
});
beforeEach(() => {
  vi.clearAllMocks();
  api.getMatchingCase.mockResolvedValue(card());
  api.getMatchingHandoffs.mockResolvedValue([]);
  api.getMatchingCandidates.mockResolvedValue([]);
  api.saveMatchingPreferences.mockResolvedValue(card());
  api.askMatchingManager.mockResolvedValue(card());
});
describe("Выбор преподавателя учеником", () => {
  it("блокирует самостоятельный подбор до подтверждения тарифа, но разрешает помощь менеджера", async () => {
    api.getMatchingCase.mockResolvedValue({
      ...card(),
      tariffConfirmed: false,
      matchStatus: "tariff",
    });
    render(<TeacherMatchingPanel token="student" />);
    const choose = await screen.findByRole("button", {
      name: "Выбрать преподавателя",
    });
    expect(choose.disabled).toBe(true);
    fireEvent.click(
      screen.getByRole("button", { name: "Пусть менеджер подберёт" }),
    );
    await waitFor(() =>
      expect(api.askMatchingManager).toHaveBeenCalledWith(
        "student",
        expect.objectContaining({ slots: card().availableSlots }),
      ),
    );
  });
  it("сохраняет выбранный приоритет и не позволяет выбрать больше трёх преподавателей", async () => {
    api.getMatchingCandidates.mockResolvedValue(
      [1, 2, 3, 4].map((id) => ({
        id,
        name: "Учитель " + id,
        matchPercent: 80,
        interests: [],
        suggestedSlots: [],
      })),
    );
    render(<TeacherMatchingPanel token="student" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Выбрать преподавателя" }),
    );
    const choices = await screen.findAllByRole("button", {
      name: "Выбрать",
      exact: true,
    });
    fireEvent.click(choices[2]);
    fireEvent.click(choices[0]);
    fireEvent.click(choices[1]);
    expect(choices[3].disabled).toBe(true);
    fireEvent.click(
      screen.getByRole("button", { name: "Отправить заявки (3/3)" }),
    );
    await waitFor(() =>
      expect(api.sendMatchingRequests).toHaveBeenCalledWith(
        "student",
        [3, 1, 2],
      ),
    );
  });
  it("подтверждает расписание серверным запросом", async () => {
    api.getMatchingCase.mockResolvedValue({
      ...card(),
      matchStatus: "confirm",
      assignedTeacherName: "Алия",
      proposedSlots: card().availableSlots,
      deadline: "2026-11-01T12:00:00",
    });
    render(<TeacherMatchingPanel token="student" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Подтвердить расписание" }),
    );
    await waitFor(() =>
      expect(api.confirmMatchingSchedule).toHaveBeenCalledWith("student"),
    );
  });
  it("после смены пользователя не показывает запоздавший ответ предыдущего аккаунта", async () => {
    let resolve;
    api.getMatchingCase.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const view = render(<TeacherMatchingPanel token="first" />);
    api.getMatchingCase.mockResolvedValue({ ...card(), tariff: "Kids" });
    view.rerender(<TeacherMatchingPanel token="second" />);
    await screen.findByText(/Kids · 60 мин/);
    resolve({ ...card(), tariff: "IELTS" });
    await waitFor(() =>
      expect(screen.queryByText(/IELTS · 60 мин/)).toBeNull(),
    );
  });
});
