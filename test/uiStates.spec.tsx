import React from 'react';
import {render} from '@testing-library/react-native';
import {Text} from 'react-native';
import {Poster, TitleCard, monogram} from '../src/components/Poster';
import {EmptyState, StatusPill} from '../src/components/Shell';
import {Button, Chip} from '../src/components/Focusable';
import {CATALOGUE} from '../src/engine/catalogue';

describe('UI States and TV Components', () => {
  describe('Poster and TitleCard', () => {
    it('generates deterministic monograms correctly', () => {
      expect(monogram('')).toBe('?');
      expect(monogram('Coco')).toBe('CO');
      expect(monogram('Paddington 2')).toBe('P2');
      expect(monogram('Knives Out')).toBe('KO');
    });

    it('renders missing artwork fallback when title is missing or incomplete', () => {
      const {getByText, getByLabelText} = render(
        <Poster title={null} width={280} height={160} />,
      );
      expect(getByText('No artwork')).toBeTruthy();
      expect(getByLabelText('Artwork unavailable')).toBeTruthy();
    });

    it('renders catalogue poster with content rating tag', () => {
      const sample = CATALOGUE[0];
      const {getByText} = render(
        <Poster title={sample} width={280} height={160} />,
      );
      expect(getByText(sample.contentRating)).toBeTruthy();
    });

    it('renders TitleCard with score badge, metadata, and reason', () => {
      const sample = CATALOGUE[0];
      const {getByText} = render(
        <TitleCard
          title={sample}
          score={92}
          reasons={['Family-suitable rating', 'Under 2 hours']}
          testID="test-card"
        />,
      );
      expect(getByText(sample.title)).toBeTruthy();
      expect(getByText('92')).toBeTruthy();
      expect(getByText('→ Family-suitable rating')).toBeTruthy();
    });
  });

  describe('EmptyState', () => {
    it('renders title, body, icon, and actions', () => {
      const {getByText} = render(
        <EmptyState
          icon="🎬"
          title="No results found"
          body="Try broadening your request."
          action={<Text>Action button</Text>}
        />,
      );
      expect(getByText('🎬')).toBeTruthy();
      expect(getByText('No results found')).toBeTruthy();
      expect(getByText('Try broadening your request.')).toBeTruthy();
      expect(getByText('Action button')).toBeTruthy();
    });
  });

  describe('StatusPill', () => {
    it('renders idle status with provider name', () => {
      const {getByText, getByTestId} = render(
        <StatusPill status="idle" provider="LUMA local engine" />,
      );
      expect(getByText('LUMA local engine')).toBeTruthy();
      expect(getByTestId('status-pill')).toBeTruthy();
    });

    it('renders processing state with thinking indicator', () => {
      const {getByText} = render(
        <StatusPill status="processing" provider="LUMA local engine" />,
      );
      expect(getByText('Thinking…')).toBeTruthy();
    });

    it('renders error state', () => {
      const {getByText} = render(
        <StatusPill status="error" provider="LUMA local engine" />,
      );
      expect(getByText('Could not process')).toBeTruthy();
      expect(getByText('⚠')).toBeTruthy();
    });
  });

  describe('Button and Chip focusable variants', () => {
    it('renders primary button with accessible label', () => {
      const {getByText, getByLabelText} = render(
        <Button label="Ask LUMA" tone="primary" testID="btn-ask" />,
      );
      expect(getByText('Ask LUMA')).toBeTruthy();
      expect(getByLabelText('Ask LUMA')).toBeTruthy();
    });

    it('renders chip with prefix and label', () => {
      const {getByText} = render(
        <Chip label="Family" prefix="›" tone="warm" testID="chip-family" />,
      );
      expect(getByText('› Family')).toBeTruthy();
    });
  });
});
