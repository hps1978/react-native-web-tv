/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

'use strict';

import * as React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useTVEventHandler,
  Platform,
  Pressable,
  TouchableHighlight,
  TouchableNativeFeedback,
  TouchableOpacity,
  TVEventControl,
  TVFocusGuideView,
  type TVRemoteEvent
} from 'react-native';
import { setupSpatialNavigation } from 'react-native-web/dist/modules/SpatialManager';

const focusHandler = (event: $FlowFixMe, props: any) => {
  if (props.noBubbledEvents) {
    event.name = undefined;
    event.stopPropagation();
  } else {
    event.name = props.title;
  }
  props.log(`Focus on ${props.title} at ${event.nativeEvent?.target}`);
};

const blurHandler = (event: $FlowFixMe, props: any) => {
  if (props.noBubbledEvents) {
    event.name = undefined;
    event.stopPropagation();
  } else {
    event.name = props.title;
  }
  props.log(`Blur on ${props.title} at ${event.nativeEvent?.target}`);
};

const pressEventHandler = (eventType: string, props: any) => {
  props.log(`${props.title} ${eventType}`);
};

const PressableButton = (props: {
  title: string,
  log: (entry: string) => void,
  noBubbledEvents?: boolean,
  tvParallaxProperties?: $FlowFixMe,
  accessible?: boolean,
  focusable?: boolean,
  disabled?: boolean
}) => {
  const { ...pressableProps } = props;
  return (
    <Pressable
      {...pressableProps}
      onBlur={(event: $FlowFixMe) => {
        blurHandler(event, props);
      }}
      onFocus={(event: $FlowFixMe) => {
        focusHandler(event, props);
      }}
      onLongPress={() => pressEventHandler('onLongPress', props)}
      onPress={() => pressEventHandler('onPress', props)}
      onPressIn={() => {
        pressEventHandler('onPressIn', props);
      }}
      onPressOut={() => {
        pressEventHandler('onPressOut', props);
      }}
      style={({ focused, pressed }) => [
        pressed || focused ? styles.pressableFocused : styles.pressable
      ]}
      tvParallaxProperties={props.tvParallaxProperties}
    >
      {({ focused, pressed }) => (
        <Text style={styles.pressableText}>{`${props.title}${
          focused ? ' focused' : ''
        }${pressed ? ' pressed' : ''}`}</Text>
      )}
    </Pressable>
  );
};

const PressableNonfunctionalButton = (props: {
  title: string,
  log: (entry: string) => void,
  noBubbledEvents?: boolean,
  tvParallaxProperties?: $FlowFixMe,
  accessible?: boolean,
  focusable?: boolean,
  disabled?: boolean
}) => {
  // test the fix for #744
  const { ...pressableProps } = props;
  const [userFocused, setUserFocused] = React.useState(false);
  const [userPressed, setUserPressed] = React.useState(false);
  return (
    <Pressable
      {...pressableProps}
      onBlur={(event: $FlowFixMe) => {
        blurHandler(event, props);
        setUserFocused(false);
      }}
      onFocus={(event: $FlowFixMe) => {
        focusHandler(event, props);
        setUserFocused(true);
      }}
      onLongPress={() => pressEventHandler('onLongPress', props)}
      onPress={() => pressEventHandler('onPress', props)}
      onPressIn={() => {
        pressEventHandler('onPressIn', props);
        setUserPressed(true);
      }}
      onPressOut={() => {
        pressEventHandler('onPressOut', props);
        setUserPressed(false);
      }}
      style={
        userFocused || userPressed ? styles.pressableFocused : styles.pressable
      }
      tvParallaxProperties={props.tvParallaxProperties}
    >
      <Text style={styles.pressableText}>{`${props.title}${
        userFocused ? ' focused' : ''
      }${userPressed ? ' pressed' : ''}`}</Text>
    </Pressable>
  );
};
const TouchableOpacityButton = (props: {
  title: string,
  log: (entry: string) => void
}) => {
  return (
    <TouchableOpacity
      {...props}
      onBlur={(event: any) => blurHandler(event, props)}
      onFocus={(event: any) => focusHandler(event, props)}
      onLongPress={() => pressEventHandler('onLongPress', props)}
      onPress={() => pressEventHandler('onPress', props)}
      onPressIn={() => pressEventHandler('onPressIn', props)}
      onPressOut={() => pressEventHandler('onPressOut', props)}
      style={styles.pressable}
    >
      <Text style={styles.pressableText}>{props.title}</Text>
    </TouchableOpacity>
  );
};

const TouchableHighlightButton = (props: {
  title: string,
  log: (entry: string) => void
}) => {
  return (
    <TouchableHighlight
      {...props}
      onBlur={(event: any) => blurHandler(event, props)}
      onFocus={(event: any) => focusHandler(event, props)}
      onLongPress={() => pressEventHandler('onLongPress', props)}
      onPress={() => pressEventHandler('onPress', props)}
      onPressIn={() => pressEventHandler('onPressIn', props)}
      onPressOut={() => pressEventHandler('onPressOut', props)}
      style={styles.pressable}
    >
      <Text style={styles.pressableText}>{props.title}</Text>
    </TouchableHighlight>
  );
};

const TouchableNativeFeedbackButton = (props: {
  title: string,
  log: (entry: string) => void
}) => {
  return (
    <TouchableNativeFeedback
      {...props}
      background={TouchableNativeFeedback.SelectableBackground()}
      onLongPress={() => pressEventHandler('onLongPress', props)}
      onPress={() => pressEventHandler('onPress', props)}
      onPressIn={() => pressEventHandler('onPressIn', props)}
      onPressOut={() => pressEventHandler('onPressOut', props)}
    >
      <View style={styles.pressable}>
        <Text style={styles.pressableText}>{props.title}</Text>
      </View>
    </TouchableNativeFeedback>
  );
};

const scale = Platform.isTV && Platform.OS === 'ios' ? 2 : 1;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    alignItems: 'flex-start',
    justifyContent: 'flex-start'
  },
  logContainer: {
    flexDirection: 'row',
    padding: 5 * scale,
    margin: 5 * scale,
    alignItems: 'flex-start',
    justifyContent: 'flex-start'
  },
  logText: {
    height: 600 * scale,
    fontSize: 10 * scale,
    margin: 5 * scale,
    alignSelf: 'flex-start',
    justifyContent: 'flex-start'
  },
  pressable: {
    minWidth: 200 * scale,
    height: 20 * scale,
    borderColor: 'blue',
    backgroundColor: 'blue',
    borderWidth: 1,
    borderRadius: 5 * scale,
    margin: 5 * scale
  },
  pressableFocused: {
    minWidth: 200 * scale,
    height: 20 * scale,
    borderColor: 'blue',
    backgroundColor: '#000088',
    borderWidth: 1,
    borderRadius: 5 * scale,
    margin: 5 * scale
  },
  pressableText: {
    color: 'white',
    fontSize: 12 * scale
  },
  containerView: {
    backgroundColor: '#eeeeee',
    width: 300 * scale,
    borderRadius: 5 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10 * scale,
    marginTop: 10 * scale
  }
});

export const TVEventHandlerView: () => React.Node = () => {
  const [remoteEventLog, setRemoteEventLog] = React.useState<string[]>([]);
  const [pressableEventLog, setPressableEventLog] = React.useState<string[]>(
    []
  );
  const [isContainerFocused, setIsContainerFocused] =
    React.useState<boolean>(false);

  const textInputRef = React.useRef<any>(undefined);
  const [textInputValue, setTextInputValue] = React.useState<string>('');

  const logWithAppendedEntry = (log: string[], entry: string) => {
    const limit = 20;
    const newEventLog = log.slice(log.length === limit ? 1 : 0, limit);
    newEventLog.push(entry);
    return newEventLog;
  };

  const updatePressableLog = (entry: string) => {
    setPressableEventLog((log) => logWithAppendedEntry(log, entry));
  };

  const logEntryForEvent = (event: TVRemoteEvent) => {
    return [
      `type=${event.eventType}`,
      event.eventKeyAction ? `action=${event.eventKeyAction}` : '',
      event.body?.x ? `x=${event.body?.x}` : '',
      event.body?.y ? `y=${event.body?.y}` : '',
      event.body?.velocityX ? `vx=${Math.floor(event.body?.velocityX)}` : '',
      event.body?.velocityY ? `vy=${Math.floor(event.body?.velocityY)}` : ''
    ].join(' ');
  };

  useTVEventHandler((event) => {
    const { eventType } = event;
    if (eventType !== 'focus' && eventType !== 'blur') {
      setRemoteEventLog((log) =>
        logWithAppendedEntry(log, logEntryForEvent(event))
      );
    }
  });

  // Apple TV: enable detection of pan gesture events (and disable on unmount)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.appConfig = {
      scrollConfig: {
        edgeThresholdPx: 50,
        scrollThrottleMs: 80,
        smoothScrollEnabled: true,
        scrollAnimationDurationMsVertical: 0,
        scrollAnimationDurationMsHorizontal: 0
      }
    };
    setupSpatialNavigation(document.body);
    TVEventControl.enableTVPanGesture();
    return () => TVEventControl.disableTVPanGesture();
  }, []);

  if (!Platform.isTV) {
    return (
      <View>
        <Text>This example is intended to be run on TV.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View>
          <PressableButton log={updatePressableLog} title="Pressable" />
          <PressableNonfunctionalButton
            log={updatePressableLog}
            title="Pressable nonfunctional form"
          />
          <PressableButton
            accessible={false}
            log={updatePressableLog}
            noBubbledEvents
            title="Pressable accessible={false}"
          />
          <PressableButton
            focusable={false}
            log={updatePressableLog}
            noBubbledEvents
            title="Pressable focusable={false}"
          />
          <PressableButton
            disabled={true}
            log={updatePressableLog}
            noBubbledEvents
            title="Pressable disabled={true}"
          />
          <PressableButton
            disabled={true}
            focusable={false}
            log={updatePressableLog}
            noBubbledEvents
            title="Pressable disabled={true} focusable={false}"
          />
          <PressableButton
            disabled={true}
            focusable={true}
            log={updatePressableLog}
            noBubbledEvents
            title="Pressable disabled={true} focusable={true}"
          />
          <PressableButton
            log={updatePressableLog}
            title="Pressable tvOS expand"
            tvParallaxProperties={{
              enabled: true,
              magnification: 1.05,
              pressMagnification: 1.1
            }}
          />
          <TouchableOpacityButton
            log={updatePressableLog}
            title="TouchableOpacity"
          />
          <TouchableOpacityButton
            focusable={false}
            log={updatePressableLog}
            title="TouchableOpacity focusable={false}"
          />
          <TouchableOpacityButton
            disabled={true}
            log={updatePressableLog}
            title="TouchableOpacity disabled={true}"
          />
          <TouchableOpacityButton
            disabled={true}
            focusable={false}
            log={updatePressableLog}
            title="TouchableOpacity disabled={true} focusable={false}"
          />
          <TouchableHighlightButton
            log={updatePressableLog}
            title="TouchableHighlight"
          />
          <TouchableHighlightButton
            focusable={false}
            log={updatePressableLog}
            title="TouchableHighlight focusable={false}"
          />
          <TouchableHighlightButton
            disabled={true}
            log={updatePressableLog}
            title="TouchableHighlight disabled={true}"
          />
          <TouchableHighlightButton
            disabled={true}
            focusable={false}
            log={updatePressableLog}
            title="TouchableHighlight disabled={true} focusable={false}"
          />
          {Platform.OS === 'android' ? (
            <TouchableNativeFeedbackButton
              log={updatePressableLog}
              title="TouchableNativeFeedback"
            />
          ) : null}
        </View>
        <TVFocusGuideView
          onBlur={(event: any) => {
            updatePressableLog(
              `Container received bubbled blur event from ${event.name} at ${event.nativeEvent.target}`
            );
            setIsContainerFocused(false);
          }}
          onBlurCapture={(event: any) => {
            updatePressableLog(
              `Container captured blur event for ${event.nativeEvent.target}`
            );
          }}
          onFocus={(event: any) => {
            updatePressableLog(
              `Container received bubbled focus event from ${event.name} at ${event.nativeEvent?.target}`
            );
            setIsContainerFocused(true);
          }}
          onFocusCapture={(event: any) => {
            updatePressableLog(
              `Container captured focus event for ${event.nativeEvent.target}`
            );
          }}
          style={[
            styles.containerView,
            isContainerFocused ? { backgroundColor: '#cccccc' } : {}
          ]}
        >
          <Text style={{ fontSize: 12 * scale }}>
            Container receives bubbled events
          </Text>
          <PressableButton
            log={updatePressableLog}
            title="Contained button 1"
          />
          <PressableButton
            log={updatePressableLog}
            noBubbledEvents
            title="Contained button 2"
          />
        </TVFocusGuideView>
        <View
          onBlur={(event: $FlowFixMe) => {
            updatePressableLog(`Blur bubbled from ${event.nativeEvent.target}`);
          }}
          onFocus={(event: $FlowFixMe) => {
            updatePressableLog(
              `Focus bubbled from ${event.nativeEvent.target}`
            );
          }}
          style={styles.containerView}
        >
          <Text style={{ fontSize: 12 * scale }}>
            TextInput wrapped with TouchableOpacity
          </Text>
          <TouchableOpacity
            onPress={() => textInputRef.current?.focus()}
            style={[
              styles.pressable,
              {
                backgroundColor: '#cccccc',
                height: 50 * scale
              }
            ]}
          >
            <View>
              <TextInput
                onBlur={(event: $FlowFixMe) =>
                  updatePressableLog(
                    `TextInput ${event.nativeEvent.target} is blurred`
                  )
                }
                onChange={(value: any) => {
                  setTextInputValue(value.nativeEvent.text);
                }}
                onFocus={(event: $FlowFixMe) =>
                  updatePressableLog(
                    `TextInput ${event.nativeEvent.target} is focused`
                  )
                }
                onSubmitEditing={(value: any) => {
                  setTextInputValue(value.nativeEvent.text);
                  console.log(value.nativeEvent.text);
                }}
                placeholder="Enter a value"
                placeholderTextColor="#0000ff"
                ref={textInputRef}
                style={[
                  styles.pressableText,
                  { color: 'red', height: 50 * scale }
                ]}
                value={textInputValue}
              />
            </View>
          </TouchableOpacity>
          <Text style={{ fontSize: 12 * scale }}>Unwrapped TextInput</Text>
          <TextInput
            onBlur={(event: $FlowFixMe) =>
              updatePressableLog(
                `TextInput ${event.nativeEvent.target} is blurred`
              )
            }
            onChange={(value: any) => {
              setTextInputValue(value.nativeEvent.text);
            }}
            onFocus={(event: $FlowFixMe) =>
              updatePressableLog(
                `TextInput ${event.nativeEvent.target} is focused`
              )
            }
            onSubmitEditing={(value: any) => {
              setTextInputValue(value.nativeEvent.text);
              console.log(value.nativeEvent.text);
            }}
            placeholder="Enter a value"
            placeholderTextColor="#0000ff"
            ref={textInputRef}
            style={[styles.pressableText, { color: 'red', height: 50 * scale }]}
            value={textInputValue}
          />
        </View>
      </ScrollView>

      <View style={styles.logContainer}>
        <View style={{ width: 400 * scale }}>
          <Text style={{ fontSize: 16 * scale }}>Native events</Text>
          <Text style={styles.logText}>{pressableEventLog.join('\n')}</Text>
        </View>
        <View style={{ width: 200 * scale }}>
          <Text style={{ fontSize: 16 * scale }}>TV event handler events</Text>
          <Text style={styles.logText}>{remoteEventLog.join('\n')}</Text>
        </View>
      </View>
    </View>
  );
};

export default TVEventHandlerView;
