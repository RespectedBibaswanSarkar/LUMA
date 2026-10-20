import React, {useMemo, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {palette, radius, spacing, typography} from '../theme/tokens';
import {FocusRow, Header, Panel, Screen, SectionTitle} from '../components/Shell';
import {Button, Chip} from '../components/Focusable';
import {OnScreenKeyboard} from '../components/OnScreenKeyboard';
import {useApp} from '../state/AppProvider';
import {CATALOGUE} from '../engine/catalogue';
import {rankForGroup} from '../engine/groupCompatibility';
import {GroupMember} from '../engine/types';

const CHOICES = [
  'action',
  'adventure',
  'comedy',
  'drama',
  'animation',
  'family',
  'horror',
  'sci-fi',
  'thriller',
  'romance',
];

const INTENSITY_CYCLE: Array<Exclude<GroupMember['maxIntensity'], 'unknown'>> = [
  'low',
  'medium',
  'high',
];

const MAX_MEMBERS = 5;
const MIN_MEMBERS = 2;

export interface GroupHarmonyScreenProps {
  initialFocus?: string;
  onFocusChanged: (focusId: string) => void;
  onBack: () => void;
  onAsk: (utterance: string) => void;
}

export const GroupHarmonyScreen: React.FC<GroupHarmonyScreenProps> = ({
  initialFocus,
  onFocusChanged,
  onBack,
  onAsk,
}) => {
  const {session, updateMembers} = useApp();
  const members = session.groupMembers;
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');

  const preview = useMemo(() => rankForGroup(CATALOGUE, members, 3), [members]);
  const wants = (id: string): boolean => (initialFocus ?? 'group-run') === id;

  const patchMember = (id: string, patch: Partial<GroupMember>) =>
    updateMembers(members.map(m => (m.id === id ? {...m, ...patch} : m)));

  const cycleGenre = (member: GroupMember, genre: string) => {
    const liked = member.likedGenres.includes(genre);
    const disliked = member.dislikedGenres.includes(genre);
    if (!liked && !disliked) {
      patchMember(member.id, {likedGenres: [...member.likedGenres, genre]});
    } else if (liked) {
      patchMember(member.id, {
        likedGenres: member.likedGenres.filter(g => g !== genre),
        dislikedGenres: [...member.dislikedGenres, genre],
      });
    } else {
      patchMember(member.id, {dislikedGenres: member.dislikedGenres.filter(g => g !== genre)});
    }
  };

  const addMember = () => {
    if (members.length >= MAX_MEMBERS) {
      return;
    }
    const index = members.length + 1;
    updateMembers([
      ...members,
      {
        id: `guest-${index}-${Date.now()}`,
        name: `Guest ${index}`,
        likedGenres: ['comedy'],
        dislikedGenres: ['horror'],
        maxIntensity: 'medium',
        childSafeOnly: false,
      },
    ]);
  };

  const removeMember = (id: string) => {
    if (members.length <= MIN_MEMBERS) {
      return;
    }
    updateMembers(members.filter(m => m.id !== id));
  };

  const startRename = (member: GroupMember, focusId: string) => {
    setRenamingId(member.id);
    setNameDraft(member.name);
    onFocusChanged(focusId);
  };

  const commitRename = () => {
    if (renamingId && nameDraft.trim()) {
      patchMember(renamingId, {name: nameDraft.trim().slice(0, 22)});
    }
    setRenamingId(null);
  };

  return (
    <Screen>
      <Header
        title="Group Harmony"
        subtitle="Balance the room, not just the individual"
        onBack={onBack}
        backFirstFocus={false}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Set up who is watching. LUMA scores every catalogue title against each member's explicit
          preferences and shows the trade-offs it had to make. The score is plain arithmetic over
          catalogue fields — the formula is documented in the README, and unverifiable metadata
          lowers the score instead of counting as a pass.
        </Text>

        <SectionTitle>WHO IS WATCHING?</SectionTitle>
        <View style={styles.memberGrid}>
          {members.map((member, memberIndex) => (
            <Panel key={member.id} style={styles.memberPanel} title={`MEMBER ${memberIndex + 1}`}>
              <View style={styles.memberHeader}>
                <Text numberOfLines={1} style={styles.memberName}>
                  {member.name}
                </Text>
                <Chip
                  label="Rename"
                  prefix="✎"
                  onFocus={() => onFocusChanged(`rename-${member.id}`)}
                  hasTVPreferredFocus={wants(`rename-${member.id}`)}
                  onPress={() => startRename(member, `rename-${member.id}`)}
                  testID={`rename-${member.id}`}
                />
                <Chip
                  label="Remove"
                  prefix="−"
                  disabled={members.length <= MIN_MEMBERS}
                  onFocus={() => onFocusChanged(`remove-${member.id}`)}
                  hasTVPreferredFocus={wants(`remove-${member.id}`)}
                  onPress={() => removeMember(member.id)}
                  testID={`remove-${member.id}`}
                />
              </View>

              <Text style={styles.prefLabel}>GENRES — PRESS TO CYCLE: LIKE → AVOID → OFF</Text>
              <FocusRow>
                {CHOICES.map((genre, genreIndex) => {
                  const liked = member.likedGenres.includes(genre);
                  const disliked = member.dislikedGenres.includes(genre);
                  const focusId = `genre-${member.id}-${genreIndex}`;
                  return (
                    <Chip
                      key={genre}
                      label={liked ? `+ ${genre}` : disliked ? `− ${genre}` : genre}
                      tone={liked ? 'accent' : 'default'}
                      onFocus={() => onFocusChanged(focusId)}
                      hasTVPreferredFocus={wants(focusId)}
                      onPress={() => cycleGenre(member, genre)}
                      testID={focusId}
                    />
                  );
                })}
              </FocusRow>

              <View style={styles.memberToggles}>
                <Chip
                  label={`Max intensity: ${member.maxIntensity}`}
                  prefix="◈"
                  onFocus={() => onFocusChanged(`intensity-${member.id}`)}
                  hasTVPreferredFocus={wants(`intensity-${member.id}`)}
                  onPress={() =>
                    patchMember(member.id, {
                      maxIntensity:
                        INTENSITY_CYCLE[
                          (INTENSITY_CYCLE.indexOf(member.maxIntensity) + 1) %
                            INTENSITY_CYCLE.length
                        ],
                    })
                  }
                  testID={`intensity-${member.id}`}
                />
                <Chip
                  label={
                    member.childSafeOnly
                      ? 'Family-suitable titles only'
                      : 'Any rating is acceptable'
                  }
                  prefix={member.childSafeOnly ? '●' : '○'}
                  tone={member.childSafeOnly ? 'warm' : 'default'}
                  onFocus={() => onFocusChanged(`child-${member.id}`)}
                  hasTVPreferredFocus={wants(`child-${member.id}`)}
                  onPress={() => patchMember(member.id, {childSafeOnly: !member.childSafeOnly})}
                  testID={`child-${member.id}`}
                />
              </View>
            </Panel>
          ))}
        </View>

        <FocusRow>
          <Button
            label={members.length >= MAX_MEMBERS ? 'Group is full' : '+ Add a member'}
            disabled={members.length >= MAX_MEMBERS}
            onFocus={() => onFocusChanged('group-add')}
            hasTVPreferredFocus={wants('group-add')}
            onPress={addMember}
            testID="group-add"
          />
          <Button
            label="Find something that works for everyone"
            tone="primary"
            onFocus={() => onFocusChanged('group-run')}
            hasTVPreferredFocus={wants('group-run')}
            onPress={() => onAsk('Find something that works for everyone')}
            testID="group-run"
          />
          <Button
            label="Back"
            onFocus={() => onFocusChanged('group-back')}
            hasTVPreferredFocus={wants('group-back')}
            onPress={onBack}
            testID="group-back"
          />
        </FocusRow>

        <SectionTitle tone="warm">BEST COMPATIBILITY RIGHT NOW</SectionTitle>
        <FocusRow style={styles.previewRow}>
          {preview.map(result => (
            <View key={result.title.id} style={styles.previewCard}>
              <View style={styles.previewHead}>
                <Text numberOfLines={1} style={styles.previewTitle}>
                  {result.title.title}
                </Text>
                <View
                  style={[
                    styles.scoreBadge,
                    result.score >= 70 ? styles.scoreHigh : styles.scoreMid,
                  ]}>
                  <Text style={styles.scoreText}>{result.score}%</Text>
                </View>
              </View>
              <Text style={styles.previewMeta}>
                {result.title.runtimeMin} min · {result.title.genres.slice(0, 3).join(' · ')}
              </Text>
              {result.perMember.map(per => (
                <Text key={per.memberId} numberOfLines={3} style={styles.previewLine}>
                  {per.memberName}: {per.satisfied.length} satisfied
                  {per.unsatisfied.length ? `, ${per.unsatisfied.length} unmet` : ''}
                  {per.unverified.length ? `, ${per.unverified.length} unverified` : ''}
                </Text>
              ))}
              {result.tradeoffs.length ? (
                <Text numberOfLines={3} style={styles.previewTradeoff}>
                  Trade-offs: {result.tradeoffs.slice(0, 3).join(' · ')}
                </Text>
              ) : null}
              <Text style={styles.previewScoreNote}>
                score = round(100 × satisfied preference signals ÷ total signals)
              </Text>
            </View>
          ))}
        </FocusRow>
      </ScrollView>

      {renamingId ? (
        <View style={styles.renameBar}>
          <Text style={styles.renameLabel}>RENAME MEMBER — THEN PRESS ASK LUMA</Text>
          <OnScreenKeyboard
            value={nameDraft}
            onChange={setNameDraft}
            onSubmit={commitRename}
            onClose={() => setRenamingId(null)}
            testID="rename-keyboard"
          />
        </View>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: {flex: 1},
  scrollContent: {paddingBottom: spacing.xl},
  intro: {...typography.body, color: palette.textSecondary, maxWidth: 1300, marginBottom: spacing.md},
  memberGrid: {flexDirection: 'row', flexWrap: 'wrap'},
  memberPanel: {width: 860, marginRight: spacing.md, marginBottom: spacing.md},
  memberHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm},
  memberName: {...typography.heading, flex: 1, color: palette.textPrimary},
  prefLabel: {
    ...typography.caption,
    color: palette.textSecondary,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  memberToggles: {flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs},
  previewRow: {alignItems: 'stretch'},
  previewCard: {
    width: 560,
    marginRight: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.md,
  },
  previewHead: {flexDirection: 'row', alignItems: 'center'},
  previewTitle: {...typography.heading, fontSize: 28, flex: 1, color: palette.textPrimary},
  scoreBadge: {borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4},
  scoreHigh: {backgroundColor: palette.success},
  scoreMid: {backgroundColor: palette.highlight},
  scoreText: {color: palette.background, fontWeight: '800', fontSize: 22},
  previewMeta: {...typography.caption, color: palette.textSecondary, marginVertical: 4},
  previewLine: {...typography.caption, fontSize: 20, color: palette.textPrimary},
  previewTradeoff: {...typography.caption, fontSize: 20, color: palette.highlight, marginTop: 4},
  previewScoreNote: {
    ...typography.caption,
    fontSize: 18,
    color: palette.textDisabled,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  renameBar: {marginTop: spacing.sm},
  renameLabel: {
    ...typography.caption,
    color: palette.highlight,
    letterSpacing: 2,
    marginBottom: 4,
  },
});
