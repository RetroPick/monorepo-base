package ethops

import (
	"encoding/hex"
	"math/big"
	"reflect"

	"github.com/ethereum/go-ethereum/common"
)

var bigIntType = reflect.TypeOf(big.Int{})

// ToJSONMap converts ABI-unpacked structs (nested) into JSON-friendly maps/values.
func ToJSONMap(v any) any {
	return normalize(reflect.ValueOf(v))
}

func normalize(rv reflect.Value) any {
	if !rv.IsValid() {
		return nil
	}
	if rv.Kind() == reflect.Ptr {
		if rv.IsNil() {
			return nil
		}
		return normalize(rv.Elem())
	}

	switch rv.Kind() {
	case reflect.Bool, reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64,
		reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64, reflect.Float32, reflect.Float64:
		return rv.Interface()
	case reflect.String:
		return rv.String()
	case reflect.Array:
		if rv.Type().Elem().Kind() == reflect.Uint8 {
			n := rv.Len()
			b := make([]byte, n)
			for i := 0; i < n; i++ {
				b[i] = byte(rv.Index(i).Uint())
			}
			switch n {
			case 20:
				var a common.Address
				copy(a[:], b)
				return a.Hex()
			case 32:
				var h common.Hash
				copy(h[:], b)
				return h.Hex()
			default:
				return "0x" + hex.EncodeToString(b)
			}
		}
		return rv.Interface()
	case reflect.Slice:
		if rv.Type().Elem().Kind() == reflect.Uint8 {
			b := rv.Bytes()
			if len(b) == 0 {
				return "0x"
			}
			return "0x" + hex.EncodeToString(b)
		}
		n := rv.Len()
		out := make([]any, n)
		for i := 0; i < n; i++ {
			out[i] = normalize(rv.Index(i))
		}
		return out
	case reflect.Struct:
		if rv.Type() == bigIntType {
			bi := rv.Interface().(big.Int)
			return bi.String()
		}
		// common.Address
		if a, ok := rv.Interface().(common.Address); ok {
			return a.Hex()
		}
		// common.Hash
		if h, ok := rv.Interface().(common.Hash); ok {
			return h.Hex()
		}
		// *big.Int stored in interface as struct field
		rt := rv.Type()
		out := make(map[string]any)
		for i := 0; i < rt.NumField(); i++ {
			f := rt.Field(i)
			if !f.IsExported() {
				continue
			}
			name := f.Tag.Get("abi")
			if name == "" {
				name = f.Tag.Get("json")
			}
			if name == "" || name == "-" {
				continue
			}
			out[name] = normalize(rv.Field(i))
		}
		return out
	default:
		// *big.Int as interface{}
		if bi, ok := rv.Interface().(*big.Int); ok {
			if bi == nil {
				return "0"
			}
			return bi.String()
		}
		return rv.Interface()
	}
}
