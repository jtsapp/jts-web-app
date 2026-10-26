// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
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
// The panel renders 336 time-slot buttons. Keep a bounded cold-render budget for the shared CI runner.
vi.setConfig({ testTimeout: 30_000 });

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
  vi.resetAllMocks();
  api.getMatchingCase.mockResolvedValue(card());
  api.getMatchingHandoffs.mockResolvedValue([]);
  api.getMatchingCandidates.mockResolvedValue([]);
  api.saveMatchingPreferences.mockResolvedValue(card());
  api.askMatchingManager.mockResolvedValue(card());
  api.sendMatchingRequests.mockResolvedValue(card());
  api.confirmMatchingSchedule.mockResolvedValue(card());
});
describe("Выбор преподавателя учеником", () => {
  it("блокирует самостоятельный подбор до подтверждения тарифа, но разрешает помощь менеджера", async () => {
    api.getMatchingCase.mockResolvedValue({
      ...card(),
      tariffConfirmed: false,
      matchStatus: "tariff",
    });
    render(<TeacherMatchingPanel token="student" />);
    const choose = await screen.findByText("Выбрать преподавателя", {selector: "button"});
    expect(choose.disabled).toBe(true);
    fireEvent.click(
      screen.getByText("Пусть менеджер подберёт", {selector: "button"}),
    );
    await waitFor(() =>
      expect(api.askMatchingManager).toHaveBeenCalledWith(
        "student",
        expect.objectContaining({ slots: card().availableSlots }),
      ),
    );
  });
  it("сохраняет выбранный приоритет и не позволяет выбрать больше трёх преподавателей", async () => {
    let finishRefresh;
    api.getMatchingCase.mockResolvedValueOnce(card()).mockImplementationOnce(
      () => new Promise((resolve) => { finishRefresh = resolve; }),
    );
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
      await screen.findByText("Выбрать преподавателя", {selector: "button"}),
    );
    const teachers = await screen.findAllByRole("article");
    const choices = teachers.map((teacher) => within(teacher).getByRole("button", { name: "Выбрать", exact: true }));
    // Карточки появляются до завершения refresh: до снятия busy они ещё
    // выключены. Ждём доступного действия, чтобы быстрый mock не скрывал гонку.
    expect(choices.every((button) => button.disabled)).toBe(true);
    await waitFor(() => expect(typeof finishRefresh).toBe("function"));
    await act(async () => finishRefresh(card()));
    await waitFor(() => expect(choices.every((button) => !button.disabled)).toBe(true));
    fireEvent.click(choices[2]);
    fireEvent.click(choices[0]);
    fireEvent.click(choices[1]);
    expect(choices[3].disabled).toBe(true);
    fireEvent.click(
      screen.getByText("Отправить заявки (3/3)", {selector: "button"}),
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
      await screen.findByText("Подтвердить расписание", {selector: "button"}),
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
