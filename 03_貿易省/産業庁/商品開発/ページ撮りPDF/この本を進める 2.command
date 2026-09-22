#!/bin/zsh

export PATH="$HOME/.local/bin:/opt/homebrew/bin:$PATH"

SCRIPT_DIR=${0:A:h}
cd "$SCRIPT_DIR" || exit 1

PYTHON="$SCRIPT_DIR/.venv/bin/python"
if [[ ! -x "$PYTHON" ]]; then
  echo "初回準備を行います。"
  PYTHON_BOOTSTRAP=$(command -v python3)
  if [[ -z "$PYTHON_BOOTSTRAP" ]]; then
    echo "python3が見つかりません。"
    exit 1
  fi
  "$PYTHON_BOOTSTRAP" -m venv "$SCRIPT_DIR/.venv" || exit 1
  "$PYTHON" -m pip install -r "$SCRIPT_DIR/requirements.txt" || exit 1
fi

"$PYTHON" "$SCRIPT_DIR/book_pipeline.py" "$@"
RESULT=$?

echo
if [[ -t 0 ]]; then
  read "REPLY?Enterキーで閉じます..."
fi
exit $RESULT
