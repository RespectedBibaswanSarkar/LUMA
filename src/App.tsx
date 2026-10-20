import React, {useCallback, useEffect, useRef, useState} from 'react';
import {BackHandler} from 'react-native';
import {AppProvider} from './state/AppProvider';
import {Route} from './navigation/routes';
import {HomeScreen} from './screens/HomeScreen';
import {ConversationScreen} from './screens/ConversationScreen';
import {RecommendationsScreen} from './screens/RecommendationsScreen';
import {DetailsScreen} from './screens/DetailsScreen';
import {GroupHarmonyScreen} from './screens/GroupHarmonyScreen';

/**
 * LUMA — Your Living Room, Understood.
 *
 * Root navigator: a small explicit stack (home → chat → results → details,
 * home → group) with per-screen focus memory, so Back always restores focus
 * to the element the viewer left from.
 */
export const App: React.FC = () => (
  <AppProvider>
    <Navigator />
  </AppProvider>
);

const Navigator: React.FC = () => {
  const [stack, setStack] = useState<Route[]>([{name: 'home'}]);
  const focusMemory = useRef<Record<string, string>>({});
  const seq = useRef(0);

  const route = stack[stack.length - 1];

  const push = useCallback((next: Route) => setStack(prev => [...prev, next]), []);
  const pop = useCallback(
    () => setStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev)),
    [],
  );

  const rememberFocus = useCallback((key: string, focusId: string) => {
    focusMemory.current[key] = focusId;
  }, []);
  const recallFocus = useCallback((key: string) => focusMemory.current[key], []);

  // Remote Back button: pop one screen; at the root let the system decide.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 1) {
        pop();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [stack.length, pop]);

  const openChat = useCallback(
    (preset?: string) => push({name: 'chat', preset, seq: ++seq.current}),
    [push],
  );
  const openTitle = useCallback((titleId: string) => push({name: 'details', titleId}), [push]);

  const screenKey = `${route.name}-${'seq' in route && route.seq ? route.seq : ''}-${
    'titleId' in route ? route.titleId : ''
  }`;

  switch (route.name) {
    case 'chat':
      return (
        <ConversationScreen
          key={screenKey}
          preset={route.preset}
          initialFocus={recallFocus('chat')}
          onFocusChanged={focusId => rememberFocus('chat', focusId)}
          onBack={pop}
          onOpenResults={() => push({name: 'results'})}
        />
      );
    case 'results':
      return (
        <RecommendationsScreen
          key={screenKey}
          initialFocus={recallFocus('results')}
          onFocusChanged={focusId => rememberFocus('results', focusId)}
          onBack={pop}
          onOpenTitle={openTitle}
          onAsk={utterance => openChat(utterance)}
        />
      );
    case 'details':
      return (
        <DetailsScreen
          key={screenKey}
          titleId={route.titleId}
          initialFocus={recallFocus(`details:${route.titleId}`)}
          onFocusChanged={focusId => rememberFocus(`details:${route.titleId}`, focusId)}
          onBack={pop}
          onAsk={utterance => openChat(utterance)}
          onOpenGroup={() => push({name: 'group'})}
        />
      );
    case 'group':
      return (
        <GroupHarmonyScreen
          key={screenKey}
          initialFocus={recallFocus('group')}
          onFocusChanged={focusId => rememberFocus('group', focusId)}
          onBack={pop}
          onAsk={utterance => openChat(utterance)}
        />
      );
    case 'home':
    default:
      return (
        <HomeScreen
          key={screenKey}
          initialFocus={recallFocus('home')}
          onFocusChanged={focusId => rememberFocus('home', focusId)}
          onAsk={utterance => openChat(utterance)}
          onOpenChat={() => openChat()}
          onOpenGroup={() => push({name: 'group'})}
          onOpenTitle={openTitle}
        />
      );
  }
};
