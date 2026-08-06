import { Text, type StyleProp, type TextStyle } from 'react-native';

/**
 * Affiche un texte en rendant cliquables les @mentions et #hashtags.
 * - @handle → onPressMention(handle) (sans le @)
 * - #tag    → onPressTag(tag) (sans le #)
 * Le reste est du texte brut. Utilisable partout (légendes, commentaires).
 */
export function RichText({
  text,
  style,
  linkStyle,
  numberOfLines,
  onPressMention,
  onPressTag,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  linkStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
  onPressMention?: (handle: string) => void;
  onPressTag?: (tag: string) => void;
}) {
  // On capture @handle (lettres/chiffres/._) et #tag (lettres accentuées/chiffres/_).
  const parts = text.split(/(@[A-Za-z0-9_.]+|#[\wÀ-ÿ]+)/gu);
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((p, i) => {
        if (/^@[A-Za-z0-9_.]+$/.test(p) && onPressMention) {
          return (
            <Text key={i} style={linkStyle} onPress={() => onPressMention(p.slice(1))}>
              {p}
            </Text>
          );
        }
        if (/^#[\wÀ-ÿ]+$/u.test(p) && onPressTag) {
          return (
            <Text key={i} style={linkStyle} onPress={() => onPressTag(p.slice(1))}>
              {p}
            </Text>
          );
        }
        return p;
      })}
    </Text>
  );
}
