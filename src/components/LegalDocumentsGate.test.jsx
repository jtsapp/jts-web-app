// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import LegalDocumentsGate from './LegalDocumentsGate.jsx'
import { LEGAL_VERSION, isLegalDocumentsScreen } from '../lib/legalDocuments.js'
import { getLegalAcknowledgement, acceptLegalDocuments } from '../api.js'
vi.mock('../api.js', () => ({ getLegalAcknowledgement: vi.fn(), acceptLegalDocuments: vi.fn() }))

const pending = { version: LEGAL_VERSION, acceptedAt: null }
const accepted = { version: LEGAL_VERSION, acceptedAt: '2026-10-29T05:00:00Z' }
const view = (token = 'one', required = true) => <I18nProvider><LegalDocumentsGate key={token} token={token}
  required={required} onLogout={() => {}}><div>student content</div></LegalDocumentsGate></I18nProvider>
beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  getLegalAcknowledgement.mockResolvedValue(pending)
  acceptLegalDocuments.mockResolvedValue(accepted)
})

describe('one-time account agreement', () => {
  it('does not precheck consent, mounts content only after the server saves it', async () => {
    render(view())
    const checkbox = await screen.findByRole('checkbox')
    expect(checkbox.checked).toBe(false)
    expect(screen.queryByText('student content')).toBeNull()
    const submit = screen.getByRole('button', { name: 'Согласиться и продолжить' })
    expect(submit.disabled).toBe(true)
    expect(screen.getAllByRole('link').map((x) => x.getAttribute('href'))).toEqual([
      `/legal/${LEGAL_VERSION}/offer-ru.pdf`, `/legal/${LEGAL_VERSION}/privacy-ru.pdf`, `/legal/${LEGAL_VERSION}/payment-security-ru.pdf`,
    ])
    fireEvent.click(checkbox)
    fireEvent.click(submit)
    await screen.findByText('student content')
    expect(acceptLegalDocuments).toHaveBeenCalledWith('one', { version: LEGAL_VERSION, accepted: true, language: 'ru' })
  })
  it('restores agreement on a new browser session and asks independently for another account', async () => {
    getLegalAcknowledgement.mockResolvedValueOnce(accepted)
    const { rerender } = render(view())
    await screen.findByText('student content')
    rerender(view('two'))
    await screen.findByRole('checkbox')
    expect(screen.queryByText('student content')).toBeNull()
    expect(getLegalAcknowledgement).toHaveBeenLastCalledWith('two')
  })
  it('keeps the prompt when saving fails and allows retry', async () => {
    acceptLegalDocuments.mockRejectedValueOnce(new Error('offline'))
    render(view())
    fireEvent.click(await screen.findByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Согласиться и продолжить' }))
    await screen.findByRole('alert')
    expect(screen.queryByText('student content')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Согласиться и продолжить' }))
    await screen.findByText('student content')
  })
  it('does not silently accept on failed status loading', async () => {
    getLegalAcknowledgement.mockRejectedValueOnce(new Error('offline'))
    render(view())
    await screen.findByRole('alert')
    expect(screen.queryByText('student content')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    await screen.findByRole('checkbox')
    expect(acceptLegalDocuments).not.toHaveBeenCalled()
  })
  it('switches original document language and resets the unchecked action', async () => {
    render(view())
    fireEvent.click(await screen.findByRole('checkbox'))
    fireEvent.change(screen.getByRole('combobox', { name: 'Язык документов' }), { target: { value: 'kk' } })
    expect(screen.getByRole('checkbox').checked).toBe(false)
    expect(screen.getAllByRole('link').every((x) => x.href.endsWith('-kk.pdf'))).toBe(true)
  })
  it('waits for Google profile completion before showing documents on entry to the cabinet', async () => {
    const { rerender } = render(view('one', isLegalDocumentsScreen('reg-google')))
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(getLegalAcknowledgement).not.toHaveBeenCalled()
    rerender(view('one', isLegalDocumentsScreen('home')))
    await screen.findByRole('checkbox')
    expect(getLegalAcknowledgement).toHaveBeenCalledTimes(1)
  })
  it('leaves teachers and guests unaffected', () => {
    render(view(null, false))
    expect(screen.getByText('student content')).toBeTruthy()
    expect(getLegalAcknowledgement).not.toHaveBeenCalled()
  })
})
