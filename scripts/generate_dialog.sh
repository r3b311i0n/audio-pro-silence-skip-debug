#!/bin/bash

############################################
# Requirements check
############################################
if ! command -v ffmpeg &> /dev/null; then
    echo "FFmpeg is required but not installed."
    echo "Install with: brew install ffmpeg"
    exit 1
fi

if ! command -v ffprobe &> /dev/null; then
    echo "ffprobe (part of ffmpeg) is required."
    exit 1
fi

DICT="/usr/share/dict/words"
if [ ! -f "$DICT" ]; then
    echo "Dictionary file not found at $DICT"
    exit 1
fi

############################################
# Get silence durations
############################################
echo "Enter silence durations in seconds (space separated, e.g. 20 10):"
read -a SILENCES
NUM_DIALOGS=$((${#SILENCES[@]} + 1))

WORKDIR="dialog_build_$$"
mkdir "$WORKDIR"
cd "$WORKDIR"

############################################
# Sentence generator (no hardcoding)
############################################
generate_sentence() {
    subj=$(grep "^[A-Z][a-z]\+$" $DICT | shuf -n1)
    verb=$(grep "^[a-z]\{4,8\}$" $DICT | shuf -n1)
    obj=$(grep "^[a-z]\{4,8\}$" $DICT | shuf -n1)
    echo "$subj will $verb the $obj."
}

############################################
# Generate random-length dialogue
############################################
generate_dialog_audio() {
    INDEX=$1
    TARGET_LENGTH=$((RANDOM % 16 + 5))  # 5–20 seconds

    echo "Generating dialog $((INDEX+1)) (target ~${TARGET_LENGTH}s)"

    TEXT=""
    DURATION=0

    while (( $(echo "$DURATION < $TARGET_LENGTH" | bc -l) )); do
        TEXT="$TEXT $(generate_sentence)"
        say -o "temp_$INDEX.aiff" "$TEXT"

        DURATION=$(ffprobe -i "temp_$INDEX.aiff" \
            -show_entries format=duration \
            -v quiet -of csv="p=0")
    done

    mv "temp_$INDEX.aiff" "dialog_$INDEX.aiff"
}

############################################
# Generate dialogues
############################################
for ((i=0; i<NUM_DIALOGS; i++))
do
    generate_dialog_audio "$i"
done

############################################
# Convert AIFF → WAV
############################################
for file in dialog_*.aiff
do
    ffmpeg -i "$file" "${file%.aiff}.wav" -y -loglevel quiet
done

############################################
# Generate silence WAV files
############################################
for ((i=0; i<${#SILENCES[@]}; i++))
do
    DURATION=${SILENCES[$i]}
    echo "Generating ${DURATION}s silence"
    ffmpeg -f lavfi -t "$DURATION" -i anullsrc=r=44100:cl=mono "silence_$i.wav" -y -loglevel quiet
done

############################################
# Build concat list
############################################
CONCAT_FILE="files.txt"
> "$CONCAT_FILE"

for ((i=0; i<NUM_DIALOGS; i++))
do
    echo "file 'dialog_$i.wav'" >> "$CONCAT_FILE"
    if [ $i -lt ${#SILENCES[@]} ]; then
        echo "file 'silence_$i.wav'" >> "$CONCAT_FILE"
    fi
done

############################################
# Final output (MP3)
############################################
ffmpeg -f concat -safe 0 -i "$CONCAT_FILE" \
  -vn -c:a libmp3lame -q:a 2 \
  "../final_output.mp3" -y -loglevel quiet


cd ..
rm -rf "$WORKDIR"
rm final_output.wav

echo ""
echo "✅ Done."
echo "Created: final_output.mp3"
