def main_handler(event, context):
    return {
        'isBase64Encoded': False,
        'statusCode': 200,
        'headers': {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'},
        'body': 'OK'
    }
